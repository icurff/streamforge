package com.example.demo.model;

import lombok.Data;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Data
@DynamoDbBean
public class Video {
    private String id;
    private String username;
    private String title;
    private String description = "";
    private String thumbnail = "";
    private Integer duration = 0;
    private String s3RawKey;
    private String s3OutputPrefix;
    private Set<EVideoResolution> resolutions = new HashSet<>();
    private EVideoPrivacy privacy = EVideoPrivacy.PUBLIC;
    private Instant uploadedDate = Instant.now();
    private Instant lastModifiedDate = Instant.now();

    @DynamoDbPartitionKey
    public String getId() {
        return id;
    }
}
