package com.example.demo.repository;

import com.example.demo.config.DynamoDbConfig;
import com.example.demo.model.EVideoPrivacy;
import com.example.demo.model.Video;
import jakarta.annotation.PostConstruct;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;

import java.util.*;
import java.util.stream.Collectors;

@Repository
public class VideoRepository {

    private final DynamoDbEnhancedClient enhancedClient;
    private final DynamoDbConfig dynamoDbConfig;
    private DynamoDbTable<Video> table;

    public VideoRepository(DynamoDbEnhancedClient enhancedClient, DynamoDbConfig dynamoDbConfig) {
        this.enhancedClient = enhancedClient;
        this.dynamoDbConfig = dynamoDbConfig;
    }

    @PostConstruct
    public void init() {
        String tableName = dynamoDbConfig.getTableName("videos");
        this.table = enhancedClient.table(tableName, TableSchema.fromBean(Video.class));
    }

    public Video save(Video video) {
        if (video.getId() == null || video.getId().isEmpty()) {
            video.setId(UUID.randomUUID().toString());
        }
        table.putItem(video);
        return video;
    }

    public Optional<Video> findById(String id) {
        if (id == null) return Optional.empty();
        Video video = table.getItem(Key.builder().partitionValue(id).build());
        return Optional.ofNullable(video);
    }

    public void deleteById(String id) {
        if (id != null) {
            table.deleteItem(Key.builder().partitionValue(id).build());
        }
    }

    public void delete(Video video) {
        if (video != null && video.getId() != null) {
            deleteById(video.getId());
        }
    }

    public List<Video> findAll() {
        return table.scan().items().stream().collect(Collectors.toList());
    }

    public List<Video> findByUsernameOrderByUploadedDateDesc(String username, Pageable pageable) {
        return table.scan().items().stream()
                .filter(v -> Objects.equals(v.getUsername(), username))
                .sorted((v1, v2) -> {
                    if (v1.getUploadedDate() == null || v2.getUploadedDate() == null) return 0;
                    return v2.getUploadedDate().compareTo(v1.getUploadedDate());
                })
                .limit(pageable != null ? pageable.getPageSize() : 50)
                .collect(Collectors.toList());
    }

    public List<Video> findByUsernameAndPrivacyOrderByUploadedDateDesc(String username, EVideoPrivacy privacy, Pageable pageable) {
        return findByUsernameOrderByUploadedDateDesc(username, pageable).stream()
                .filter(v -> v.getPrivacy() == privacy)
                .collect(Collectors.toList());
    }

    public List<Video> findByPrivacyOrderByUploadedDateDesc(EVideoPrivacy privacy, Pageable pageable) {
        return table.scan().items().stream()
                .filter(v -> v.getPrivacy() == privacy)
                .sorted((v1, v2) -> {
                    if (v1.getUploadedDate() == null || v2.getUploadedDate() == null) return 0;
                    return v2.getUploadedDate().compareTo(v1.getUploadedDate());
                })
                .limit(pageable != null ? pageable.getPageSize() : 50)
                .collect(Collectors.toList());
    }
}
