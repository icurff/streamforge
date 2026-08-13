package com.example.demo.repository;

import com.example.demo.config.DynamoDbConfig;
import com.example.demo.model.User;
import jakarta.annotation.PostConstruct;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;

import java.util.*;
import java.util.stream.Collectors;

@Repository
public class UserRepository {

    private final DynamoDbEnhancedClient enhancedClient;
    private final DynamoDbConfig dynamoDbConfig;
    private DynamoDbTable<User> table;

    public UserRepository(DynamoDbEnhancedClient enhancedClient, DynamoDbConfig dynamoDbConfig) {
        this.enhancedClient = enhancedClient;
        this.dynamoDbConfig = dynamoDbConfig;
    }

    @PostConstruct
    public void init() {
        String tableName = dynamoDbConfig.getTableName("users");
        this.table = enhancedClient.table(tableName, TableSchema.fromBean(User.class));
    }

    public User save(User user) {
        if (user.getId() == null || user.getId().isEmpty()) {
            user.setId(UUID.randomUUID().toString());
        }
        table.putItem(user);
        return user;
    }

    public Optional<User> findById(String id) {
        if (id == null) return Optional.empty();
        User user = table.getItem(Key.builder().partitionValue(id).build());
        return Optional.ofNullable(user);
    }

    public void deleteById(String id) {
        if (id != null) {
            table.deleteItem(Key.builder().partitionValue(id).build());
        }
    }

    public void delete(User user) {
        if (user != null && user.getId() != null) {
            deleteById(user.getId());
        }
    }

    public List<User> findAll() {
        return table.scan().items().stream().collect(Collectors.toList());
    }

    public Page<User> findAll(Pageable pageable) {
        List<User> items = findAll();
        int pageSize = pageable != null ? pageable.getPageSize() : 20;
        int pageNumber = pageable != null ? pageable.getPageNumber() : 0;
        int start = Math.min(pageNumber * pageSize, items.size());
        int end = Math.min(start + pageSize, items.size());
        List<User> pagedList = items.subList(start, end);
        return new PageImpl<>(pagedList, pageable != null ? pageable : Pageable.unpaged(), items.size());
    }

    public Optional<User> findByUsername(String username) {
        if (username == null) return Optional.empty();
        return table.scan().items().stream()
                .filter(u -> Objects.equals(u.getUsername(), username))
                .findFirst();
    }

    public Optional<User> findByEmail(String email) {
        if (email == null) return Optional.empty();
        return table.scan().items().stream()
                .filter(u -> Objects.equals(u.getEmail(), email))
                .findFirst();
    }

    public Optional<User> findByUsernameOrEmail(String username, String email) {
        Optional<User> byUser = findByUsername(username);
        if (byUser.isPresent()) return byUser;
        return findByEmail(email);
    }

    public Boolean existsByUsername(String username) {
        return findByUsername(username).isPresent();
    }

    public Boolean existsByEmail(String email) {
        return findByEmail(email).isPresent();
    }
}
