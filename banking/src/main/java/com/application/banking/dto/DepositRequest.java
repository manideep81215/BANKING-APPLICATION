package com.application.banking.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class DepositRequest {
    private BigDecimal amount;
}
