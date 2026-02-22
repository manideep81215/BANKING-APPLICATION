package com.application.banking.service;

import com.application.banking.model.User;
import com.application.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private boolean looksLikeBcryptHash(String value) {
        return value != null && (value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$"));
    }

    private String normalizeAndValidateAadhar(String aadharCard) {
        if (aadharCard == null) {
            return null;
        }
        String normalized = aadharCard.replaceAll("\\s+", "");
        if (!normalized.matches("\\d{12}")) {
            throw new IllegalArgumentException("Aadhaar card must be exactly 12 digits.");
        }
        return normalized;
    }

    public User createUser(User user) {
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new IllegalArgumentException("Password is required.");
        }
        if (!looksLikeBcryptHash(user.getPassword())) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        if (user.getAadharCard() != null && !user.getAadharCard().isBlank()) {
            user.setAadharCard(normalizeAndValidateAadhar(user.getAadharCard()));
        }
        return userRepository.save(user);
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User updateUser(Long id, User userDetails) {
        Optional<User> existingUserOptional = userRepository.findById(id);
        if (existingUserOptional.isPresent()) {
            User existingUser = existingUserOptional.get();

            // Only update fields if they are provided in the userDetails (not null)
            if (userDetails.getName() != null) {
                existingUser.setName(userDetails.getName());
            }
            if (userDetails.getEmail() != null) {
                existingUser.setEmail(userDetails.getEmail());
            }
            // For primitive types like Long, check if it's not 0 or a specific default if applicable
            // For Long, null check is sufficient if it's an object wrapper
            if (userDetails.getNumber() != null) {
                existingUser.setNumber(userDetails.getNumber());
            }
            if (userDetails.getRole() != null) {
                existingUser.setRole(userDetails.getRole());
            }
            if (userDetails.getAadharCard() != null && !userDetails.getAadharCard().isBlank()) {
                existingUser.setAadharCard(normalizeAndValidateAadhar(userDetails.getAadharCard()));
            }
            if (userDetails.getPassword() != null && !userDetails.getPassword().isBlank()) {
                if (looksLikeBcryptHash(userDetails.getPassword())) {
                    existingUser.setPassword(userDetails.getPassword());
                } else {
                    existingUser.setPassword(passwordEncoder.encode(userDetails.getPassword()));
                }
            }

            return userRepository.save(existingUser);
        } else {
            throw new RuntimeException("User not found with id " + id);
        }
    }

    public void deleteUser(Long id) {
        // In a real application, consider a "soft delete" by updating a status field
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found with id " + id);
        }
        userRepository.deleteById(id);
    }

    public void updateAadharCard(Long id, String aadharCard) {
        String normalized = normalizeAndValidateAadhar(aadharCard);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id " + id));
        user.setAadharCard(normalized);
        userRepository.save(user);
    }
}
