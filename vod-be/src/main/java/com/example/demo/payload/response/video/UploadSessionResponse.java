package com.example.demo.payload.response.video;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadSessionResponse {
    private String sessionId;
    private String videoId;
    private String uploadUrl;
    private String destinationUrl;
    private String key;
    private String bucket;
    
    public UploadSessionResponse(String sessionId, String uploadUrl) {
        this.sessionId = sessionId;
        this.videoId = sessionId;
        this.uploadUrl = uploadUrl;
        this.destinationUrl = uploadUrl;
    }
}
