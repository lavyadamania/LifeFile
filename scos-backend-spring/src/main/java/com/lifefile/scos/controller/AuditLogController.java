package com.lifefile.scos.controller;

import com.lifefile.scos.model.AuditLog;
import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

/**
 * AuditLogController — replaces routes/auditLogs.js
 */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<?> getAuditLogs(@RequestParam(required = false) String severity, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"admin".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<AuditLog> logs;
        if (severity != null && !severity.equals("all")) {
            // Need custom query or simple filter
            logs = auditLogRepository.findAll();
            logs.removeIf(l -> !severity.equals(l.getSeverity()));
        } else {
            logs = auditLogRepository.findAll();
        }

        // Simulating sort and limit (Java list approach for simplicity)
        logs.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        if (logs.size() > 100) logs = logs.subList(0, 100);

        return ResponseEntity.ok(logs);
    }

    @PostMapping
    public ResponseEntity<?> createAuditLog(@RequestBody AuditLog logData, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return ResponseEntity.status(HttpStatus.CREATED).body(auditLogRepository.save(logData));
    }
}
