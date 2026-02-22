package com.application.banking.dto;

import com.application.banking.model.Account.AccountStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountDto {
    private Long id;
    private Long accountNumber;
    private UserDto user; // Nested UserDto
    private BigDecimal balance;
    private AccountStatus status;
    private Date createdAt;
}
