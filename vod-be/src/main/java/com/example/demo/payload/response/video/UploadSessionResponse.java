package com.example.demo.payload.response.video;

import lombok.Data;

@Data
public class UploadSessionResponse {
    private String sessionId;
    private String destinationUrl;
    
    public UploadSessionResponse(String sessionId) {
        this.sessionId = sessionId;
        this.destinationUrl = "/api/uploads/" + sessionId;
    }
}
