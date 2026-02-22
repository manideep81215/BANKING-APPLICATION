package com.application.banking.service;

import com.application.banking.dto.AccountDto;
import com.application.banking.dto.UserDto;
import com.application.banking.model.Account;
import com.application.banking.model.Transaction;
import com.application.banking.model.User;
import com.application.banking.repository.AccountRepository;
import com.application.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionService transactionService; // Inject TransactionService
    private final PasswordEncoder passwordEncoder;

    private void validateAccountIsActiveForTransactions(Account account, String context) {
        if (account.getStatus() != Account.AccountStatus.ACTIVE) {
            if (account.getStatus() == Account.AccountStatus.BLOCKED || account.getStatus() == Account.AccountStatus.INACTIVE) {
                throw new IllegalArgumentException(
                        "Transaction not allowed: " + context + " account is blocked or suspended."
                );
            }
            throw new IllegalArgumentException(
                    "Transaction not allowed: " + context + " account status is " + account.getStatus() + "."
            );
        }
    }

    private void validateOrInitializeWithdrawalPin(Account account, String pin, String confirmPin) {
        if (pin == null || !pin.matches("\\d{4}")) {
            throw new IllegalArgumentException("A valid 4-digit ATM PIN is required for withdrawal.");
        }
        if (account.getUser() == null) {
            throw new IllegalArgumentException("Unable to validate ATM PIN for this account.");
        }

        String storedAtmPinHash = account.getUser().getAtmPinHash();
        if (storedAtmPinHash == null || storedAtmPinHash.isBlank()) {
            if (confirmPin == null || !confirmPin.matches("\\d{4}")) {
                throw new IllegalArgumentException("First-time withdrawal: please confirm the same 4-digit ATM PIN.");
            }
            if (!pin.equals(confirmPin)) {
                throw new IllegalArgumentException("PIN and confirm PIN do not match.");
            }
            account.getUser().setAtmPinHash(passwordEncoder.encode(pin));
            userRepository.save(account.getUser());
            return;
        }

        if (!passwordEncoder.matches(pin, storedAtmPinHash)) {
            throw new IllegalArgumentException("Invalid ATM PIN.");
        }
    }

    private void validateFourDigitPin(String pin, String fieldName) {
        if (pin == null || !pin.matches("\\d{4}")) {
            throw new IllegalArgumentException(fieldName + " must be a valid 4-digit PIN.");
        }
    }

    // Helper method to convert User entity to UserDto
    private UserDto toUserDto(User user) {
        if (user == null) {
            return null;
        }
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getAadharCard(), user.getNumber(), user.getRole());
    }

    // Helper method to convert Account entity to AccountDto
    private AccountDto toAccountDto(Account account) {
        if (account == null) {
            return null;
        }
        UserDto userDto = toUserDto(account.getUser());
        return new AccountDto(
                account.getId(),
                account.getAccountNumber(),
                userDto,
                account.getBalance(),
                account.getStatus(),
                account.getCreatedAt()
        );
    }

    @Transactional
    public AccountDto createAccount(Account account) {
        if (account.getUser() == null || account.getUser().getId() == null) {
            throw new IllegalArgumentException("User id is required.");
        }
        Long userId = account.getUser().getId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        if (user.getAadharCard() == null || user.getAadharCard().isBlank()) {
            throw new IllegalArgumentException("Aadhaar card is required before account creation.");
        }
        account.setUser(user);
        if (account.getStatus() == null) {
            account.setStatus(Account.AccountStatus.PENDING);
        }
        if (account.getBalance() == null) {
            account.setBalance(BigDecimal.ZERO);
        }
        Account savedAccount = accountRepository.save(account);
        return toAccountDto(savedAccount);
    }

    @Transactional
    public Optional<AccountDto> getAccountById(Long id) {
        return accountRepository.findByIdWithUser(id).map(this::toAccountDto);
    }

    @Transactional
    public List<AccountDto> getAllAccounts() {
        return accountRepository.findAllWithUser().stream()
                .map(this::toAccountDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<AccountDto> getAccountsByUserId(Long userId) {
        return accountRepository.findByUserIdWithUser(userId).stream()
                .map(this::toAccountDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<AccountDto> getPendingAccountRequests() {
        return accountRepository.findByStatusWithUser(Account.AccountStatus.PENDING).stream()
                .map(this::toAccountDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AccountDto approveAccountRequest(Long id) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Account request not found with id: " + id));
        account.setStatus(Account.AccountStatus.ACTIVE);
        return toAccountDto(accountRepository.save(account));
    }

    @Transactional
    public AccountDto rejectAccountRequest(Long id) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Account request not found with id: " + id));
        account.setStatus(Account.AccountStatus.REJECTED);
        return toAccountDto(accountRepository.save(account));
    }

    @Transactional
    public AccountDto updateAccount(Long id, Account accountDetails) {
        Optional<Account> optionalAccount = accountRepository.findById(id);
        if (optionalAccount.isPresent()) {
            Account existingAccount = optionalAccount.get();

            if (accountDetails.getAccountNumber() != null) {
                existingAccount.setAccountNumber(accountDetails.getAccountNumber());
            }
            if (accountDetails.getBalance() != null) {
                existingAccount.setBalance(accountDetails.getBalance());
            }
            if (accountDetails.getStatus() != null) {
                existingAccount.setStatus(accountDetails.getStatus());
            }
            Account updatedAccount = accountRepository.save(existingAccount);
            return toAccountDto(updatedAccount);
        } else {
            throw new RuntimeException("Account not found with id " + id);
        }
    }

    @Transactional
    public void deleteAccount(Long id) {
        if (!accountRepository.existsById(id)) {
            throw new RuntimeException("Account not found with id " + id);
        }
        accountRepository.deleteById(id);
    }

    @Transactional // Ensure atomicity of balance update and transaction creation
    public AccountDto withdraw(Long accountId, BigDecimal amount, String pin, String confirmPin) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be positive.");
        }

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));
        validateAccountIsActiveForTransactions(account, "Source");
        validateOrInitializeWithdrawalPin(account, pin, confirmPin);

        if (account.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException(
                    "Insufficient funds. Current balance: " + account.getBalance() +
                    ", Requested withdrawal: " + amount
            );
        }

        // Update account balance
        account.setBalance(account.getBalance().subtract(amount));
        Account updatedAccount = accountRepository.save(account);

        // Create transaction record
        Transaction transaction = new Transaction();
        transaction.setFromAccount(account); // This is the account from which money is withdrawn
        transaction.setAmount(amount);
        transaction.setType(Transaction.TransactionType.DEBIT);
        transaction.setTimestamp(LocalDateTime.now());
        transaction.setReferenceNumber(UUID.randomUUID().toString()); // Generate a unique reference

        transactionService.createTransaction(transaction);

        return toAccountDto(updatedAccount);
    }

    @Transactional
    public void changeAtmPin(Long accountId, Long requesterUserId, String currentPin, String newPin, String confirmNewPin) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));
        if (account.getUser() == null || account.getUser().getId() == null) {
            throw new IllegalArgumentException("Unable to update ATM PIN for this account.");
        }
        if (requesterUserId == null || !requesterUserId.equals(account.getUser().getId())) {
            throw new IllegalArgumentException("You can only change PIN for your own account.");
        }

        validateFourDigitPin(currentPin, "Current PIN");
        validateFourDigitPin(newPin, "New PIN");
        validateFourDigitPin(confirmNewPin, "Confirm new PIN");

        if (!newPin.equals(confirmNewPin)) {
            throw new IllegalArgumentException("New PIN and confirm new PIN do not match.");
        }
        if (newPin.equals(currentPin)) {
            throw new IllegalArgumentException("New PIN must be different from current PIN.");
        }

        String storedAtmPinHash = account.getUser().getAtmPinHash();
        if (storedAtmPinHash == null || storedAtmPinHash.isBlank()) {
            throw new IllegalArgumentException("ATM PIN is not set yet. Please complete first-time PIN setup.");
        }
        if (!passwordEncoder.matches(currentPin, storedAtmPinHash)) {
            throw new IllegalArgumentException("Current PIN is incorrect.");
        }

        account.getUser().setAtmPinHash(passwordEncoder.encode(newPin));
        userRepository.save(account.getUser());
    }

    @Transactional // Ensure atomicity of balance update and transaction creation
    public AccountDto deposit(Long accountId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Deposit amount must be positive.");
        }

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));
        validateAccountIsActiveForTransactions(account, "Destination");

        // Update account balance
        account.setBalance(account.getBalance().add(amount));
        Account updatedAccount = accountRepository.save(account);

        // Create transaction record
        Transaction transaction = new Transaction();
        transaction.setToAccount(account); // This is the account to which money is deposited
        transaction.setAmount(amount);
        transaction.setType(Transaction.TransactionType.CREDIT);
        transaction.setTimestamp(LocalDateTime.now());
        transaction.setReferenceNumber(UUID.randomUUID().toString()); // Generate a unique reference

        transactionService.createTransaction(transaction);

        return toAccountDto(updatedAccount);
    }

    @Transactional
    public BigDecimal checkBalance(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));
        return account.getBalance();
    }

    @Transactional
    public void transferMoney(Long fromAccountId, Long toAccountId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transfer amount must be positive.");
        }

        if (fromAccountId.equals(toAccountId)) {
            throw new IllegalArgumentException("Cannot transfer money to the same account.");
        }

        Account fromAccount = accountRepository.findById(fromAccountId)
                .orElseThrow(() -> new RuntimeException("Source account not found with id: " + fromAccountId));

        Account toAccount = accountRepository.findById(toAccountId)
                .orElseThrow(() -> new RuntimeException("Destination account not found with id: " + toAccountId));
        validateAccountIsActiveForTransactions(fromAccount, "Source");
        validateAccountIsActiveForTransactions(toAccount, "Destination");

        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException(
                    "Insufficient funds in account " + fromAccountId + ". Current balance: " + fromAccount.getBalance() +
                    ", Requested transfer: " + amount
            );
        }

        // Deduct from source account
        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
        accountRepository.save(fromAccount);

        // Add to destination account
        toAccount.setBalance(toAccount.getBalance().add(amount));
        accountRepository.save(toAccount);

        // Create a single TRANSFER transaction
        Transaction transferTransaction = new Transaction();
        transferTransaction.setFromAccount(fromAccount);
        transferTransaction.setToAccount(toAccount);
        transferTransaction.setAmount(amount);
        transferTransaction.setType(Transaction.TransactionType.TRANSFER);
        transferTransaction.setTimestamp(LocalDateTime.now());
        transferTransaction.setReferenceNumber(UUID.randomUUID().toString());
        transactionService.createTransaction(transferTransaction);
    }
}
