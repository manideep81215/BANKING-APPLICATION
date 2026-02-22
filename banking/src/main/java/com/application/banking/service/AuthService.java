package com.application.banking.service;

import com.application.banking.dto.AuthResponse;
import com.application.banking.dto.LoginRequest;
import com.application.banking.dto.RegisterRequest;
import com.application.banking.model.User;
import com.application.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder; // Will be injected by Spring Security config

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("User with this email already exists.");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNumber(request.getNumber());
        // Public registration cannot self-assign privileged roles.
        user.setRole("USER");

        User savedUser = userRepository.save(user);
        return new AuthResponse(
                "Registration successful",
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getName(),
                savedUser.getRole()
        );
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        return new AuthResponse(
                "Login successful",
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole()
        );
    }
}
