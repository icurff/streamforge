package com.example.demo.payload.response.comment;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CommentPageResponse {
    private List<CommentResponse> comments;
    private int page;
    private int size;
    private boolean hasMore;
}



