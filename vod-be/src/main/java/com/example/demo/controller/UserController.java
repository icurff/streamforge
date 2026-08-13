package com.example.demo.controller;

import com.example.demo.model.User;
import com.example.demo.payload.request.user.UpdateUserRolesRequest;
import com.example.demo.payload.response.user.UserAdminResponse;
import com.example.demo.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.demo.security.UserDetailsImpl;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/")
    public ResponseEntity<?> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        if (page < 0) page = 0;
        if (size <= 0) size = 5;
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdDate"));
        Page<User> userPage = userService.getUsersPage(pageable);
        List<UserAdminResponse> content = userPage.getContent().stream().map(this::toResponse).collect(Collectors.toList());
        Map<String, Object> body = Map.of(
                "content", content,
                "page", userPage.getNumber(),
                "size", userPage.getSize(),
                "totalElements", userPage.getTotalElements(),
                "totalPages", userPage.getTotalPages()
        );
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUser(@PathVariable String userId) {
        User user = userService.getUserById(userId);
        return ResponseEntity.ok(toResponse(user));
    }

    @PutMapping("/{userId}/roles")
    public ResponseEntity<?> updateRoles(@PathVariable String userId,
                                         @Valid @RequestBody UpdateUserRolesRequest request) {
        User updated = userService.updateUserRoles(userId, request.getRoles());
        return ResponseEntity.ok(toResponse(updated));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable String userId) {
        userService.deleteUser(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{userId}/avatar")
    public ResponseEntity<?> uploadAvatar(@PathVariable String userId,
                                         @RequestParam("file") MultipartFile file,
                                         @AuthenticationPrincipal UserDetailsImpl user) {
        if (user == null || (!user.getId().equals(userId) && !user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")))) {
            return ResponseEntity.status(403).body(Map.of("error", "You do not have permission to update this avatar"));
        }

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is required"));
        }

        try {
            var updatedUser = userService.updateUserAvatar(userId, file);
            return ResponseEntity.ok(toResponse(updatedUser));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload avatar: " + e.getMessage()));
        }
    }

    private UserAdminResponse toResponse(User user) {
        return new UserAdminResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getAvatar(),
                user.getRoles().stream().map(Enum::name).toList(),
                user.getCreatedDate()
        );
    }
}


