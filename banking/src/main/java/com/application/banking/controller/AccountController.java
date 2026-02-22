package com.application.banking.controller;

import com.application.banking.dto.AccountDto;
import com.application.banking.dto.ChangePinRequest;
import com.application.banking.dto.DepositRequest;
import com.application.banking.dto.WithdrawRequest;
import com.application.banking.dto.TransferRequest; // Import TransferRequest
import com.application.banking.model.Account;
import com.application.banking.model.User;
import com.application.banking.service.AccountService;
import com.application.banking.service.UserService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final UserService userService;

    private Long resolveEffectiveUserId(HttpSession session) {
        Object sessionUserIdAttr = session.getAttribute("userId");
        if (sessionUserIdAttr instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    private String resolveSessionRole(HttpSession session) {
        Object role = session.getAttribute("userRole");
        return role == null ? null : String.valueOf(role);
    }

    private boolean isPrivilegedRole(String role) {
        return "ADMIN".equalsIgnoreCase(String.valueOf(role))
                || "MANAGER".equalsIgnoreCase(String.valueOf(role));
    }

    private boolean canAccessAccount(Long accountId, Long userId, String role) {
        if (isPrivilegedRole(role)) {
            return true;
        }
        Optional<AccountDto> account = accountService.getAccountById(accountId);
        return account.isPresent()
                && account.get().getUser() != null
                && userId != null
                && userId.equals(account.get().getUser().getId());
    }

    private String extractAadharFromRequest(Account account) {
        if (account == null || account.getUser() == null) {
            return null;
        }
        return account.getUser().getAadharCard();
    }

    @PostMapping
    public ResponseEntity<?> createAccount(
            @RequestBody Account account,
            HttpSession session
    ) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        boolean isAuthenticated = sessionRole != null && effectiveUserId != null;
        if (!isAuthenticated) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }

        if (!isPrivilegedRole(sessionRole)) {
            return new ResponseEntity<>("Only admin or manager can create accounts.", HttpStatus.FORBIDDEN);
        }
        if (account.getUser() == null || account.getUser().getId() == null) {
            return new ResponseEntity<>("User id is required.", HttpStatus.BAD_REQUEST);
        }
        String aadharCard = extractAadharFromRequest(account);
        if (aadharCard == null || aadharCard.isBlank()) {
            return new ResponseEntity<>("Aadhaar card is required.", HttpStatus.BAD_REQUEST);
        }

        try {
            userService.updateAadharCard(account.getUser().getId(), aadharCard);
            AccountDto createdAccount = accountService.createAccount(account);
            return new ResponseEntity<>(createdAccount, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/request")
    public ResponseEntity<?> requestAccount(
            @RequestBody Account account,
            HttpSession session
    ) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        boolean isAuthenticated = sessionRole != null && effectiveUserId != null;
        if (!isAuthenticated) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (isPrivilegedRole(sessionRole)) {
            return new ResponseEntity<>("Admins/managers should use account creation, not request flow.", HttpStatus.BAD_REQUEST);
        }
        if (effectiveUserId == null) {
            return new ResponseEntity<>("Invalid user session.", HttpStatus.UNAUTHORIZED);
        }
        String aadharCard = extractAadharFromRequest(account);
        if (aadharCard == null || aadharCard.isBlank()) {
            return new ResponseEntity<>("Aadhaar card is required.", HttpStatus.BAD_REQUEST);
        }

        // Enforce requester ownership and pending review status.
        User requester = new User();
        requester.setId(effectiveUserId);
        account.setUser(requester);
        account.setStatus(Account.AccountStatus.PENDING);

        try {
            userService.updateAadharCard(effectiveUserId, aadharCard);
            AccountDto createdAccount = accountService.createAccount(account);
            return new ResponseEntity<>(createdAccount, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAccountById(@PathVariable Long id, HttpSession session) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (sessionRole == null || effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!canAccessAccount(id, effectiveUserId, sessionRole)) {
            return new ResponseEntity<>("You are not allowed to view this account.", HttpStatus.FORBIDDEN);
        }

        Optional<AccountDto> account = accountService.getAccountById(id);
        if (account.isPresent()) {
            return new ResponseEntity<>(account.get(), HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllAccounts(HttpSession session) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (sessionRole == null || effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(sessionRole)) {
            return new ResponseEntity<>("Only admin or manager can view all accounts.", HttpStatus.FORBIDDEN);
        }
        List<AccountDto> accounts = accountService.getAllAccounts();
        return new ResponseEntity<>(accounts, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getAccountsByUserId(@PathVariable Long userId, HttpSession session) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (sessionRole == null || effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(sessionRole) && !effectiveUserId.equals(userId)) {
            return new ResponseEntity<>("You are not allowed to view these accounts.", HttpStatus.FORBIDDEN);
        }
        List<AccountDto> accounts = accountService.getAccountsByUserId(userId);
        return new ResponseEntity<>(accounts, HttpStatus.OK);
    }

    @GetMapping("/requests")
    public ResponseEntity<?> getPendingAccountRequests(HttpSession session) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (sessionRole == null || effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(sessionRole)) {
            return new ResponseEntity<>("Only admin or manager can view account requests.", HttpStatus.FORBIDDEN);
        }
        List<AccountDto> requests = accountService.getPendingAccountRequests();
        return new ResponseEntity<>(requests, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAccount(
            @PathVariable Long id,
            @RequestBody Account accountDetails,
            HttpSession session
    ) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        boolean isAuthenticated = sessionRole != null && effectiveUserId != null;
        if (!isAuthenticated) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(sessionRole)) {
            return new ResponseEntity<>("Only admin or manager can edit accounts.", HttpStatus.FORBIDDEN);
        }

        try {
            AccountDto updatedAccount = accountService.updateAccount(id, accountDetails);
            return new ResponseEntity<>(updatedAccount, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAccount(@PathVariable Long id, HttpSession session) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (sessionRole == null || effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(sessionRole)) {
            return new ResponseEntity<>("Only admin or manager can delete accounts.", HttpStatus.FORBIDDEN);
        }
        try {
            accountService.deleteAccount(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT); // 204 No Content for successful deletion
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/{id}/withdraw")
    public ResponseEntity<?> withdraw(@PathVariable Long id, @RequestBody WithdrawRequest request, HttpSession session) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (sessionRole == null || effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!canAccessAccount(id, effectiveUserId, sessionRole)) {
            return new ResponseEntity<>("You are not allowed to withdraw from this account.", HttpStatus.FORBIDDEN);
        }
        try {
            AccountDto updatedAccount = accountService.withdraw(id, request.getAmount(), request.getPin(), request.getConfirmPin());
            return new ResponseEntity<>(updatedAccount, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/{id}/pin/change")
    public ResponseEntity<?> changeAtmPin(
            @PathVariable Long id,
            @RequestBody ChangePinRequest request,
            HttpSession session
    ) {
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }

        try {
            accountService.changeAtmPin(id, effectiveUserId, request.getCurrentPin(), request.getNewPin(), request.getConfirmNewPin());
            return new ResponseEntity<>("ATM PIN updated successfully.", HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/{id}/deposit")
    public ResponseEntity<?> deposit(@PathVariable Long id, @RequestBody DepositRequest request, HttpSession session) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (sessionRole == null || effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!canAccessAccount(id, effectiveUserId, sessionRole)) {
            return new ResponseEntity<>("You are not allowed to deposit to this account.", HttpStatus.FORBIDDEN);
        }
        try {
            AccountDto updatedAccount = accountService.deposit(id, request.getAmount());
            return new ResponseEntity<>(updatedAccount, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/{id}/balance") // New endpoint to check balance
    public ResponseEntity<?> checkBalance(@PathVariable Long id, HttpSession session) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (sessionRole == null || effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!canAccessAccount(id, effectiveUserId, sessionRole)) {
            return new ResponseEntity<>("You are not allowed to view this balance.", HttpStatus.FORBIDDEN);
        }
        try {
            BigDecimal balance = accountService.checkBalance(id);
            return new ResponseEntity<>(balance, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND); // Account not found
        }
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> transferMoney(@RequestBody TransferRequest request, HttpSession session) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (sessionRole == null || effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(sessionRole) && !canAccessAccount(request.getFromAccountId(), effectiveUserId, sessionRole)) {
            return new ResponseEntity<>("You are not allowed to transfer from this account.", HttpStatus.FORBIDDEN);
        }
        try {
            accountService.transferMoney(request.getFromAccountId(), request.getToAccountId(), request.getAmount());
            return new ResponseEntity<>("Transfer successful", HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveAccountRequest(@PathVariable Long id, HttpSession session) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (sessionRole == null || effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(sessionRole)) {
            return new ResponseEntity<>("Only admin or manager can approve requests.", HttpStatus.FORBIDDEN);
        }
        try {
            AccountDto updatedAccount = accountService.approveAccountRequest(id);
            return new ResponseEntity<>(updatedAccount, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectAccountRequest(@PathVariable Long id, HttpSession session) {
        String sessionRole = resolveSessionRole(session);
        Long effectiveUserId = resolveEffectiveUserId(session);
        if (sessionRole == null || effectiveUserId == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(sessionRole)) {
            return new ResponseEntity<>("Only admin or manager can reject requests.", HttpStatus.FORBIDDEN);
        }
        try {
            AccountDto updatedAccount = accountService.rejectAccountRequest(id);
            return new ResponseEntity<>(updatedAccount, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }
}
