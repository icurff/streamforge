package com.example.demo.controller;

import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.Video;
import com.example.demo.payload.request.video.UpdateVideoPrivacyRequest;
import com.example.demo.security.UserDetailsImpl;
import com.example.demo.service.VideoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/videos")
@CrossOrigin(origins = "*", maxAge = 3600)
public class VideoController {

    @Autowired
    private VideoService videoService;

    @GetMapping("/{videoId}")
    public ResponseEntity<?> getVideo(@PathVariable String videoId,
                                      @AuthenticationPrincipal UserDetailsImpl user) {
        try {
            Video vid = videoService.getVideoForUser(videoId, user != null ? user.getUsername() : null);
            return ResponseEntity.ok(vid);
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ex.getMessage());
        }
    }

    @GetMapping("/recent")
    public ResponseEntity<?> getRecentVideos(
            @RequestParam(name = "limit", defaultValue = "12") int limit,
            @AuthenticationPrincipal UserDetailsImpl user
    ) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }
        return ResponseEntity.ok(videoService.getRecentVideosForUser(user.getUsername(), limit));
    }

    @DeleteMapping("/{videoId}")
    public ResponseEntity<?> deleteVideo(@PathVariable String videoId,
                                         @AuthenticationPrincipal UserDetailsImpl user) {
        try {
            videoService.deleteVideo(videoId, user.getUsername());
            return ResponseEntity.noContent().build();
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ex.getMessage());
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ex.getMessage());
        }
    }

    @PatchMapping("/{videoId}")
    public ResponseEntity<?> updateVideoMetadata(@PathVariable String videoId,
                                                 @RequestBody Map<String, String> payload,
                                                 @AuthenticationPrincipal UserDetailsImpl user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }
        try {
            String title = payload.get("title");
            String description = payload.get("description");
            String thumbnail = payload.get("thumbnail");

            Video updated = videoService.updateVideoMetadata(
                    videoId,
                    user.getUsername(),
                    title,
                    description,
                    thumbnail
            );
            return ResponseEntity.ok(updated);
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ex.getMessage()));
        } catch (ResourceNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update video: " + e.getMessage()));
        }
    }

    @PatchMapping("/{videoId}/privacy")
    public ResponseEntity<?> updatePrivacy(@PathVariable String videoId,
                                           @Valid @RequestBody UpdateVideoPrivacyRequest request,
                                           @AuthenticationPrincipal UserDetailsImpl user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }
        try {
            Video updated = videoService.updateVideoPrivacy(videoId, user.getUsername(), request.getPrivacy());
            return ResponseEntity.ok(updated);
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ex.getMessage());
        }
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<?> getPublicVideosByUsername(
            @PathVariable String username,
            @RequestParam(name = "limit", defaultValue = "50") int limit
    ) {
        return ResponseEntity.ok(videoService.getPublicVideosByUsername(username, limit));
    }

    @GetMapping("/public")
    public ResponseEntity<?> getAllPublicVideos(
            @RequestParam(name = "limit", defaultValue = "50") int limit,
            @RequestParam(name = "offset", defaultValue = "0") int offset
    ) {
        return ResponseEntity.ok(videoService.getAllPublicVideos(limit, offset));
    }

    @PostMapping("/{videoId}/thumbnail")
    public ResponseEntity<?> uploadThumbnail(@PathVariable String videoId,
                                            @RequestParam("file") MultipartFile file,
                                            @AuthenticationPrincipal UserDetailsImpl user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is required"));
        }

        try {
            Video updated = videoService.updateVideoThumbnail(videoId, user.getUsername(), file);
            return ResponseEntity.ok(updated);
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ex.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload thumbnail: " + e.getMessage()));
        }
    }
}
