package com.example.demo.payload.request.video;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class NewUploadSessionRequest {
    private Integer totalChunks;

    @NotBlank
    private String fileName;

    private String fileType;

    // in bytes
    private Long fileSize;

    private Integer duration;
}
