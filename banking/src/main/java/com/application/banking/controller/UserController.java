
package com.application.banking.controller;

import com.application.banking.model.User;
import com.application.banking.service.UserService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional; // Import Optional

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    private Long resolveEffectiveUserId(HttpSession session) {
        Object sessionUserIdAttr = session.getAttribute("userId");
        if (sessionUserIdAttr instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    private String resolveEffectiveRole(HttpSession session) {
        Object sessionRole = session.getAttribute("userRole");
        if (sessionRole != null) {
            return String.valueOf(sessionRole);
        }
        return null;
    }

    private boolean hasRole(String role, String expected) {
        return expected.equalsIgnoreCase(String.valueOf(role));
    }

    private boolean isPrivilegedRole(String role) {
        return hasRole(role, "ADMIN") || hasRole(role, "MANAGER");
    }

    @PostMapping
    public ResponseEntity<?> createUser(
            @RequestBody User user,
            HttpSession session
    ) {
        String requesterRole = resolveEffectiveRole(session);
        if (requesterRole == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(requesterRole)) {
            return new ResponseEntity<>("Only admin or manager can create users.", HttpStatus.FORBIDDEN);
        }
        User createdUser = userService.createUser(user);
        return new ResponseEntity<>(createdUser, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(
            @PathVariable Long id,
            HttpSession session
    ) {
        String requesterRole = resolveEffectiveRole(session);
        if (requesterRole == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(requesterRole)) {
            return new ResponseEntity<>("Only admin or manager can view users.", HttpStatus.FORBIDDEN);
        }
        Optional<User> user = userService.getUserById(id);
        if (user.isPresent()) {
            return new ResponseEntity<>(user.get(), HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllUsers(
            HttpSession session
    ) {
        String requesterRole = resolveEffectiveRole(session);
        if (requesterRole == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(requesterRole)) {
            return new ResponseEntity<>("Only admin or manager can view users.", HttpStatus.FORBIDDEN);
        }
        List<User> users = userService.getAllUsers();
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestBody User userDetails,
            HttpSession session
    ) {
        String requesterRole = resolveEffectiveRole(session);
        if (requesterRole == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }
        if (!isPrivilegedRole(requesterRole)) {
            return new ResponseEntity<>("Only admin or manager can update users.", HttpStatus.FORBIDDEN);
        }
        try {
            User updatedUser = userService.updateUser(id, userDetails);
            return new ResponseEntity<>(updatedUser, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id,
            HttpSession session
    ) {
        String requesterRole = resolveEffectiveRole(session);
        if (requesterRole == null) {
            return new ResponseEntity<>("Please login first.", HttpStatus.UNAUTHORIZED);
        }

        Optional<User> targetUser = userService.getUserById(id);
        if (targetUser.isEmpty()) {
            return new ResponseEntity<>("User not found.", HttpStatus.NOT_FOUND);
        }

        String targetRole = targetUser.get().getRole();
        boolean isAdmin = hasRole(requesterRole, "ADMIN");

        if (!isPrivilegedRole(requesterRole)) {
            return new ResponseEntity<>("Only admin or manager can delete users.", HttpStatus.FORBIDDEN);
        }
        if (isAdmin && hasRole(targetRole, "ADMIN")) {
            return new ResponseEntity<>("Admin users can only be deleted by manager.", HttpStatus.FORBIDDEN);
        }

        try {
            userService.deleteUser(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }
}
