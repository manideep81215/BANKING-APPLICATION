package com.application.banking.service;

import com.application.banking.dto.TransactionDto;
import com.application.banking.model.Transaction;
import com.application.banking.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;

    @Transactional
    public Transaction createTransaction(Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    @Transactional(readOnly = true)
    public Optional<Transaction> getTransactionById(Long id) {
        return transactionRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<TransactionDto> getTransactionsByAccountId(Long accountId) {
        return transactionRepository.findByAccountIdWithAccounts(accountId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TransactionDto> getAllTransactions() {
        return transactionRepository.findAllWithAccounts()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TransactionDto> getTransactionsByUserId(Long userId) {
        return transactionRepository.findByUserIdWithAccounts(userId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private TransactionDto toDto(Transaction transaction) {
        Long fromAccountId = transaction.getFromAccount() != null ? transaction.getFromAccount().getId() : null;
        Long fromAccountNumber = transaction.getFromAccount() != null ? transaction.getFromAccount().getAccountNumber() : null;
        Long toAccountId = transaction.getToAccount() != null ? transaction.getToAccount().getId() : null;
        Long toAccountNumber = transaction.getToAccount() != null ? transaction.getToAccount().getAccountNumber() : null;

        return new TransactionDto(
                transaction.getId(),
                fromAccountId,
                fromAccountNumber,
                toAccountId,
                toAccountNumber,
                transaction.getAmount(),
                transaction.getType(),
                transaction.getTimestamp(),
                transaction.getReferenceNumber()
        );
    }

    // Service logic for other Transaction-related operations
}
