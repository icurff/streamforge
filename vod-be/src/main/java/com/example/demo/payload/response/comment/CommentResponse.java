package com.example.demo.payload.response.comment;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Data
@Builder
public class CommentResponse {
    private String id;
    private String videoId;
    private String parentCommentId;
    private String userId;
    private String username;
    private String content;
    private Instant createdAt;
    private Instant updatedAt;
    private long likesCount;
    private boolean likedByCurrentUser;
    @Builder.Default
    private List<CommentResponse> replies = Collections.emptyList();
}



