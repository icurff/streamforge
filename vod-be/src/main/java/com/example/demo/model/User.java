package com.example.demo.model;

import lombok.Data;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Data
@DynamoDbBean
public class User {
    private String id;
    private String username;
    private String email;
    private String password;
    private String avatar;
    private Instant createdDate = Instant.now();
    private Instant lastModifiedDate = Instant.now();
    private Set<ERole> roles = new HashSet<>();

    public User() {
    }

    public User(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.roles.add(ERole.ROLE_ADMIN);
        this.createdDate = Instant.now();
        this.lastModifiedDate = Instant.now();
    }

    @DynamoDbPartitionKey
    public String getId() {
        return id;
    }

    public Set<ERole> getRoles() {
        if (roles != null && roles.isEmpty()) {
            return null;
        }
        return roles;
    }

    public void setRoles(Set<ERole> roles) {
        this.roles = (roles != null && !roles.isEmpty()) ? roles : null;
    }
}