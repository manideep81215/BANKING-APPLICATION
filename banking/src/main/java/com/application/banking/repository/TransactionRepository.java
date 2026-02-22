package com.application.banking.repository;

import com.application.banking.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction,Long> {
    @Query("""
            SELECT t
            FROM Transaction t
            LEFT JOIN FETCH t.fromAccount fa
            LEFT JOIN FETCH t.toAccount ta
            WHERE (fa.id = :accountId OR ta.id = :accountId)
            ORDER BY t.timestamp DESC, t.id DESC
            """)
    List<Transaction> findByAccountIdWithAccounts(@Param("accountId") Long accountId);

    @Query("""
            SELECT t
            FROM Transaction t
            LEFT JOIN FETCH t.fromAccount fa
            LEFT JOIN FETCH t.toAccount ta
            ORDER BY t.timestamp DESC, t.id DESC
            """)
    List<Transaction> findAllWithAccounts();

    @Query("""
            SELECT DISTINCT t
            FROM Transaction t
            LEFT JOIN FETCH t.fromAccount fa
            LEFT JOIN FETCH t.toAccount ta
            LEFT JOIN fa.user fau
            LEFT JOIN ta.user tau
            WHERE (fau.id = :userId OR tau.id = :userId)
            ORDER BY t.timestamp DESC, t.id DESC
            """)
    List<Transaction> findByUserIdWithAccounts(@Param("userId") Long userId);
}
