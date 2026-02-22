package com.application.banking.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class WithdrawRequest {
    private BigDecimal amount;
    private String pin;
    private String confirmPin;
}
