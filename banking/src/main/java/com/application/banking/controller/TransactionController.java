package com.application.banking.controller;

import com.application.banking.dto.TransactionDto;
import com.application.banking.model.Transaction;
import com.application.banking.service.TransactionService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
   private final TransactionService transactionService;

   private Long resolveEffectiveUserId(HttpSession session) {
       Object sessionUserIdAttr = session.getAttribute("userId");
       if (sessionUserIdAttr instanceof Number number) {
           return number.longValue();
       }
       return null;
   }

   private boolean isAdminFromSession(Object sessionRole) {
       return "ADMIN".equalsIgnoreCase(String.valueOf(sessionRole))
               || "MANAGER".equalsIgnoreCase(String.valueOf(sessionRole));
   }

   @GetMapping("/{id}")
   public ResponseEntity<Transaction> getTransactionById(@PathVariable Long id) {
       Optional<Transaction> transaction = transactionService.getTransactionById(id);
       return transaction.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
               .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
   }

   @GetMapping("/account/{accountId}")
   public ResponseEntity<List<TransactionDto>> getTransactionsByAccountId(@PathVariable Long accountId) {
       List<TransactionDto> transactions = transactionService.getTransactionsByAccountId(accountId);
       return new ResponseEntity<>(transactions, HttpStatus.OK);
   }

   @GetMapping("/statement")
   public ResponseEntity<?> getStatementTransactions(
           HttpSession session
   ) {
       Object sessionRole = session.getAttribute("userRole");
       Long effectiveUserId = resolveEffectiveUserId(session);
       boolean isAuthenticated = sessionRole != null || effectiveUserId != null;
       if (!isAuthenticated) {
           return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
       }
       if (!isAdminFromSession(sessionRole) && effectiveUserId == null) {
           return new ResponseEntity<>("Invalid user session.", HttpStatus.UNAUTHORIZED);
       }

       List<TransactionDto> transactions = isAdminFromSession(sessionRole)
               ? transactionService.getAllTransactions()
               : transactionService.getTransactionsByUserId(effectiveUserId);
       return new ResponseEntity<>(transactions, HttpStatus.OK);
   }
}
