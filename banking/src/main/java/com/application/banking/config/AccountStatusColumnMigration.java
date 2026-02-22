package com.application.banking.config;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AccountStatusColumnMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AccountStatusColumnMigration.class);
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                    """
                    SELECT DATA_TYPE AS data_type,
                           COALESCE(CHARACTER_MAXIMUM_LENGTH, 0) AS max_length
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'account'
                      AND COLUMN_NAME = 'status'
                    """
            );

            if (columns.isEmpty()) {
                return;
            }

            Map<String, Object> statusColumn = columns.get(0);
            String dataType = String.valueOf(statusColumn.get("data_type")).toLowerCase();
            Number maxLengthValue = (Number) statusColumn.get("max_length");
            long maxLength = maxLengthValue == null ? 0 : maxLengthValue.longValue();

            boolean isCompatible = "varchar".equals(dataType) && maxLength >= 20;
            if (isCompatible) {
                return;
            }

            jdbcTemplate.execute("ALTER TABLE `account` MODIFY COLUMN `status` VARCHAR(20) NOT NULL");

            // Convert legacy ordinal enum values to names after widening the column.
            jdbcTemplate.update(
                    """
                    UPDATE `account`
                    SET `status` = CASE `status`
                        WHEN '0' THEN 'PENDING'
                        WHEN '1' THEN 'ACTIVE'
                        WHEN '2' THEN 'INACTIVE'
                        WHEN '3' THEN 'BLOCKED'
                        WHEN '4' THEN 'CLOSED'
                        WHEN '5' THEN 'REJECTED'
                        ELSE `status`
                    END
                    WHERE `status` IN ('0', '1', '2', '3', '4', '5')
                    """
            );

            log.info("Updated account.status column to VARCHAR(20) and normalized legacy values.");
        } catch (Exception ex) {
            // Keep startup resilient even if DB permissions or schema differ.
            log.warn("Skipped account.status compatibility migration: {}", ex.getMessage());
        }
    }
}
