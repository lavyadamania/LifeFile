package com.lifefile.scos.repository;

import com.lifefile.scos.model.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    List<AuditLog> findByActorRole(String actorRole, Pageable pageable);
    List<AuditLog> findBySeverity(String severity, Pageable pageable);
}
