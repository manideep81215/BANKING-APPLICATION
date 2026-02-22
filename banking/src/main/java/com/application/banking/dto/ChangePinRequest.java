package com.application.banking.dto;

import lombok.Data;

@Data
public class ChangePinRequest {
    private String currentPin;
    private String newPin;
    private String confirmNewPin;
}
