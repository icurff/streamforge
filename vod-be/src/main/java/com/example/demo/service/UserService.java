package com.example.demo.service;

import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.ERole;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private S3StorageService s3StorageService;

    public Page<User> getUsersPage(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    public User getUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    public User updateUserRoles(String id, Set<ERole> roles) {
        User user = getUserById(id);
        user.setRoles(roles);
        return userRepository.save(user);
    }

    public void deleteUser(String id) {
        User user = getUserById(id);
        userRepository.delete(user);
    }

    public User updateUserAvatar(String id, MultipartFile avatarFile) throws IOException {
        User user = getUserById(id);
        
        // Delete old avatar from S3 if exists
        if (user.getAvatar() != null && !user.getAvatar().isEmpty()) {
            try {
                String oldKey = s3StorageService.extractKeyFromUrl(user.getAvatar());
                if (oldKey != null) {
                    s3StorageService.deleteFile(oldKey);
                }
            } catch (Exception e) {
                System.err.println("Failed to delete old avatar: " + e.getMessage());
            }
        }

        // Upload new avatar to S3
        String fileName = id + "_avatar";
        String folder = "avatars";
        String avatarUrl = s3StorageService.uploadFile(avatarFile, folder, fileName);
        
        user.setAvatar(avatarUrl);
        return userRepository.save(user);
    }
}
