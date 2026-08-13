package com.example.demo.payload.response.user;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@AllArgsConstructor
public class UserAdminResponse {
    private String id;
    private String username;
    private String email;
    private String avatar;
    private List<String> roles;
    private Instant createdDate;
}








