package com.application.banking.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
    private Long number;
    private String role; // Optional: if roles are assigned during registration
}
