package com.application.banking.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal; // Import BigDecimal
import java.util.Date;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    // Removed AccountHolderName as it's typically derived from the User or not directly on Account entity
    private Long accountNumber;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private BigDecimal balance; // Changed from long to BigDecimal

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountStatus status;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    public enum AccountStatus {
        PENDING, ACTIVE, INACTIVE, BLOCKED, CLOSED, REJECTED
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = new Date();
    }
}
