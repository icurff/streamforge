package com.example.demo.payload.response.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String id;
    private String username;
    private String email;
    private List<String> roles;

}
