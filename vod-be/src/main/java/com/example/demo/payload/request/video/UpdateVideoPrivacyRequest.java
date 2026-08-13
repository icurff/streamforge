package com.example.demo.payload.request.video;

import com.example.demo.model.EVideoPrivacy;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateVideoPrivacyRequest {
    @NotNull
    private EVideoPrivacy privacy;
}


