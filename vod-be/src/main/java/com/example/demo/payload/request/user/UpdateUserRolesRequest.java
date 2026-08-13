package com.example.demo.payload.request.user;

import com.example.demo.model.ERole;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.Set;

@Data
public class UpdateUserRolesRequest {
    @NotEmpty
    private Set<ERole> roles;
}








