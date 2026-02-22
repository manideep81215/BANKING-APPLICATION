package com.application.banking.repository;

import com.application.banking.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    @Query("SELECT a FROM Account a LEFT JOIN FETCH a.user WHERE a.id = :id")
    Optional<Account> findByIdWithUser(@Param("id") Long id);

    @Query("SELECT DISTINCT a FROM Account a LEFT JOIN FETCH a.user")
    List<Account> findAllWithUser();

    @Query("SELECT DISTINCT a FROM Account a LEFT JOIN FETCH a.user WHERE a.user.id = :userId")
    List<Account> findByUserIdWithUser(@Param("userId") Long userId);

    @Query("SELECT DISTINCT a FROM Account a LEFT JOIN FETCH a.user WHERE a.status = :status")
    List<Account> findByStatusWithUser(@Param("status") Account.AccountStatus status);
}
