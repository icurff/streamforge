package com.example.demo.service;


import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.EVideoPrivacy;
import com.example.demo.model.EVideoResolution;
import com.example.demo.model.Video;
import com.example.demo.repository.VideoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;

@Slf4j
@Service
public class VideoService {

    @Value("${icurff.app.storage:/app/storage}")
    private String storageBaseDir;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private S3StorageService s3StorageService;

    // ---- Query methods ----

    public Video getVideoById(String videoId) {
        return videoRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
    }

    public Video getVideoForUser(String videoId, String requesterUsername) {
        Video video = getVideoById(videoId);
        if (isPrivate(video) && !isOwner(video, requesterUsername)) {
            throw new AccessDeniedException("You do not have permission to view this video");
        }
        return video;
    }

    public List<Video> getRecentVideosForUser(String username, int limit) {
        Pageable pageable = PageRequest.of(0, Math.max(1, limit), Sort.by(Sort.Direction.DESC, "uploadedDate"));
        return videoRepository.findByUsernameOrderByUploadedDateDesc(username, pageable);
    }

    public List<Video> getPublicVideosByUsername(String username, int limit) {
        Pageable pageable = PageRequest.of(0, Math.max(1, limit), Sort.by(Sort.Direction.DESC, "uploadedDate"));
        return videoRepository.findByUsernameAndPrivacyOrderByUploadedDateDesc(username, EVideoPrivacy.PUBLIC, pageable);
    }

    public List<Video> getAllPublicVideos(int limit, int offset) {
        int page = Math.max(0, offset) / Math.max(1, limit);
        Pageable pageable = PageRequest.of(page, Math.max(1, limit), Sort.by(Sort.Direction.DESC, "uploadedDate"));
        return videoRepository.findByPrivacyOrderByUploadedDateDesc(EVideoPrivacy.PUBLIC, pageable);
    }

    // ---- Upload methods (merged from subServer) ----

    public String addNewVideo(String username, String title, Integer duration) {
        Video vid = new Video();
        vid.setUsername(username);
        vid.setTitle(title);
        vid.setDuration(duration);
        vid.setPrivacy(EVideoPrivacy.PUBLIC);
        videoRepository.save(vid);
        return vid.getId();
    }

    public void saveChunk(String username, String sessionId, int chunkIndex, MultipartFile chunkFile) throws IOException {
        Path chunkDir = Path.of(storageBaseDir, "uploads", username, sessionId);
        Files.createDirectories(chunkDir);
        Path chunkPath = chunkDir.resolve(String.format("chunk_%06d", chunkIndex));
        Files.copy(chunkFile.getInputStream(), chunkPath, StandardCopyOption.REPLACE_EXISTING);
    }

    public void mergeChunks(String username, String sessionId, String fileName, String fileType,
                            Long fileSize, Integer fileDuration) throws IOException {
        // Create new video record
        String vidId = addNewVideo(username, fileName, fileDuration);

        Path chunkDir = Path.of(storageBaseDir, "uploads", username, sessionId);
        Path outputVideoPath = Path.of(storageBaseDir, "outputs", username, "videos", vidId, "raw", fileName);
        Files.createDirectories(outputVideoPath.getParent());

        // Merge chunks into single file
        try (var out = Files.newOutputStream(outputVideoPath)) {
            Files.list(chunkDir)
                    .filter(p -> p.getFileName().toString().startsWith("chunk_"))
                    .sorted(Comparator.comparing(Path::getFileName))
                    .forEach(p -> {
                        try (var in = Files.newInputStream(p)) {
                            in.transferTo(out);
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    });
        }

        // Cleanup chunks
        try {
            Files.walk(chunkDir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> {
                        try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                    });
        } catch (IOException ignored) {}

        // Update S3 keys in video record
        String s3RawKey = "raw/" + username + "/" + vidId + "/" + fileName;
        String s3OutputPrefix = "outputs/" + username + "/" + vidId + "/";
        videoRepository.findById(vidId).ifPresent(video -> {
            video.setS3RawKey(s3RawKey);
            video.setS3OutputPrefix(s3OutputPrefix);
            videoRepository.save(video);
        });

        // Upload merged raw file to Azure Blob Storage under raw/ prefix
        // Event Grid triggers transcode pipeline automatically on BlobCreated event
        try {
            log.info("Uploading raw video to Azure Blob Storage: {}", s3RawKey);
            s3StorageService.uploadFileFromPath(outputVideoPath, "raw/" + username + "/" + vidId, fileName);
            log.info("Raw video uploaded successfully to Azure Blob Storage: {}", s3RawKey);
        } catch (Exception e) {
            log.error("Failed to upload raw video to Azure Blob Storage: {}", e.getMessage(), e);
            throw new IOException("Failed to upload raw video to cloud storage", e);
        } finally {
            // Cleanup local merged raw file
            try {
                Files.deleteIfExists(outputVideoPath);
                if (outputVideoPath.getParent() != null) {
                    Files.deleteIfExists(outputVideoPath.getParent());
                }
            } catch (IOException ignored) {}
        }
    }

    // ---- Update methods ----

    public void updateVideoResolution(String videoId, int resolution) {
        Video video = videoRepository.findById(videoId).orElse(null);
        if (video == null) {
            log.error("Video not found with id: {}", videoId);
            return;
        }

        EVideoResolution videoResolution = getResolutionEnum(resolution);
        if (videoResolution != null) {
            Set<EVideoResolution> resSet = video.getResolutions();
            if (resSet == null) {
                resSet = new HashSet<>();
            }
            resSet.add(videoResolution);
            video.setResolutions(resSet);
        }

        videoRepository.save(video);
        log.info("Updated video {} with resolution {}", videoId, resolution);
    }

    public Video updateVideoPrivacy(String videoId, String username, EVideoPrivacy privacy) {
        Video video = getVideoById(videoId);
        if (!isOwner(video, username)) {
            throw new AccessDeniedException("You do not have permission to update this video");
        }
        video.setPrivacy(privacy);
        return videoRepository.save(video);
    }

    public Video updateVideoMetadata(String videoId, String username, String title, String description, String thumbnail) {
        Video video = getVideoById(videoId);
        if (!isOwner(video, username)) {
            throw new AccessDeniedException("You do not have permission to update this video");
        }

        if (title != null) video.setTitle(title);
        if (description != null) video.setDescription(description);
        if (thumbnail != null) video.setThumbnail(thumbnail);

        return videoRepository.save(video);
    }

    public Video updateVideoThumbnail(String videoId, String username, MultipartFile thumbnailFile) throws IOException {
        Video video = getVideoById(videoId);
        if (!isOwner(video, username)) {
            throw new AccessDeniedException("You do not have permission to update this video");
        }

        // Delete old thumbnail from S3 if exists
        if (video.getThumbnail() != null && !video.getThumbnail().isEmpty()) {
            try {
                String oldKey = s3StorageService.extractKeyFromUrl(video.getThumbnail());
                if (oldKey != null) {
                    s3StorageService.deleteFile(oldKey);
                }
            } catch (Exception e) {
                log.warn("Failed to delete old thumbnail: {}", e.getMessage());
            }
        }

        // Upload new thumbnail to S3
        String fileName = videoId + "_thumbnail";
        String folder = "thumbnails/videos/" + username;
        String thumbnailUrl = s3StorageService.uploadFile(thumbnailFile, folder, fileName);

        video.setThumbnail(thumbnailUrl);
        return videoRepository.save(video);
    }

    // ---- Delete methods ----

    public void deleteVideo(String videoId, String username) {
        Video video = getVideoById(videoId);
        if (!video.getUsername().equals(username)) {
            throw new AccessDeniedException("You do not have permission to delete this video");
        }

        videoRepository.delete(video);

        // Delete associated files from storage
        deleteVideoFiles(username, videoId);
    }

    public boolean deleteVideoFiles(String username, String videoId) {
        // Delete local files
        Path videoDirectory = Path.of(storageBaseDir, "outputs", username, "videos", videoId);
        try {
            if (Files.exists(videoDirectory)) {
                Files.walk(videoDirectory)
                        .sorted(Comparator.reverseOrder())
                        .forEach(path -> {
                            try { Files.deleteIfExists(path); } catch (IOException e) {
                                throw new RuntimeException("Failed to delete: " + path, e);
                            }
                        });
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete video files", e);
        }

        // Delete from S3
        try {
            s3StorageService.deleteFolder("thumbnails/videos/" + username + "/" + videoId);
            s3StorageService.deleteFolder("raw/" + username + "/" + videoId);
            s3StorageService.deleteFolder("outputs/" + username + "/" + videoId);
        } catch (Exception e) {
            log.warn("Failed to delete S3 objects for video {}: {}", videoId, e.getMessage());
        }

        return true;
    }

    // ---- Helpers ----

    private boolean isPrivate(Video video) {
        return video.getPrivacy() == EVideoPrivacy.PRIVATE;
    }

    private boolean isOwner(Video video, String requesterUsername) {
        return requesterUsername != null && requesterUsername.equals(video.getUsername());
    }

    private EVideoResolution getResolutionEnum(int resolution) {
        return switch (resolution) {
            case 240 -> EVideoResolution.P240;
            case 360 -> EVideoResolution.P360;
            case 480 -> EVideoResolution.P480;
            case 720 -> EVideoResolution.P720;
            case 1080 -> EVideoResolution.P1080;
            default -> null;
        };
    }
}
