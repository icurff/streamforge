package com.example.demo.payload.request.video;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class NewUploadSessionRequest {
    @NotBlank
    @Min(1)
    private Integer totalChunks;

    @NotBlank
    private String fileName;

    @NotBlank
    private String fileType;

    // in bytes
    @NotBlank
    @Min(1)
    private Long fileSize;
}



