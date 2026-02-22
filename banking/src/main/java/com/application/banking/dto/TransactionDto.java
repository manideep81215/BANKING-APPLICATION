package com.application.banking.dto;

import com.application.banking.model.Transaction.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDto {
    private Long id;
    private Long fromAccountId;
    private Long fromAccountNumber;
    private Long toAccountId;
    private Long toAccountNumber;
    private BigDecimal amount;
    private TransactionType type;
    private LocalDateTime timestamp;
    private String referenceNumber;
}
