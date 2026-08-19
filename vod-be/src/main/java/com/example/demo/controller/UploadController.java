package com.example.demo.controller;

import com.example.demo.model.EVideoPrivacy;
import com.example.demo.model.Video;
import com.example.demo.payload.request.video.NewUploadSessionRequest;
import com.example.demo.payload.response.video.UploadSessionResponse;
import com.example.demo.repository.VideoRepository;
import com.example.demo.security.UserDetailsImpl;
import com.example.demo.service.S3StorageService;
import com.example.demo.service.VideoService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/uploads")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UploadController {

    @Autowired
    private S3StorageService s3StorageService;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private VideoService videoService;

    @Value("${aws.s3.upload-prefix:uploads/}")
    private String uploadPrefix;

    @PostMapping("/sessions")
    public ResponseEntity<?> createUploadSession(
            @Valid @RequestBody NewUploadSessionRequest request,
            @AuthenticationPrincipal UserDetailsImpl user
    ) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        try {
            String videoId = UUID.randomUUID().toString();
            String username = user.getUsername();
            String rawFileName = request.getFileName();
            String contentType = request.getFileType() != null && !request.getFileType().isBlank()
                    ? request.getFileType()
                    : "video/mp4";

            // Format S3 raw key: uploads/{username}/{videoId}/{fileName}
            String prefix = uploadPrefix.endsWith("/") ? uploadPrefix : uploadPrefix + "/";
            String s3Key = prefix + username + "/" + videoId + "/" + rawFileName;
            String s3OutputPrefix = "outputs/" + username + "/" + videoId + "/";

            // Generate presigned PUT URL for client direct upload
            String presignedUrl = s3StorageService.generatePresignedUploadUrl(s3Key, contentType, Duration.ofMinutes(60));

            // Create initial Video entity in database
            Video video = new Video();
            video.setId(videoId);
            video.setUsername(username);
            video.setTitle(rawFileName);
            video.setDuration(request.getDuration() != null ? request.getDuration() : 0);
            video.setS3RawKey(s3Key);
            video.setS3OutputPrefix(s3OutputPrefix);
            video.setPrivacy(EVideoPrivacy.PUBLIC);
            video.setUploadedDate(Instant.now());
            video.setLastModifiedDate(Instant.now());

            videoRepository.save(video);
            log.info("Created video record {} with presigned upload URL for user {}", videoId, username);

            UploadSessionResponse response = UploadSessionResponse.builder()
                    .sessionId(videoId)
                    .videoId(videoId)
                    .uploadUrl(presignedUrl)
                    .destinationUrl(presignedUrl)
                    .key(s3Key)
                    .bucket(s3StorageService.getS3BucketName())
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to create upload session: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate presigned upload URL: " + e.getMessage()));
        }
    }

    @PostMapping("/complete")
    public ResponseEntity<?> completeUpload(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserDetailsImpl user
    ) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        String videoId = (String) payload.get("videoId");
        if (videoId == null && payload.get("sessionId") != null) {
            videoId = (String) payload.get("sessionId");
        }

        if (videoId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "videoId is required"));
        }

        Integer duration = null;
        if (payload.get("duration") != null) {
            try {
                duration = Integer.valueOf(payload.get("duration").toString());
            } catch (Exception ignored) {}
        }

        Video video = videoRepository.findById(videoId).orElse(null);
        if (video != null) {
            if (duration != null && duration > 0) {
                video.setDuration(duration);
            }
            video.setLastModifiedDate(Instant.now());
            videoRepository.save(video);
            log.info("Video {} marked upload complete by user {}", videoId, user.getUsername());
        }

        return ResponseEntity.ok(Map.of("status", "SUCCESS", "videoId", videoId));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<?> getSessionStatus(@PathVariable String sessionId) {
        return ResponseEntity.ok(Map.of(
                "sessionId", sessionId,
                "status", "READY"
        ));
    }
}
