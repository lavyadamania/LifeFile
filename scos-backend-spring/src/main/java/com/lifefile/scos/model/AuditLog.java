package com.lifefile.scos.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

/** AuditLog document — mirrors models/AuditLog.js */
@Document(collection = "auditlogs")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuditLog {

    @Id private String id;

    private String actor;
    private String actorRole; // admin | doctor | patient | system
    private String action;
    @Builder.Default private String target   = "";
    @Builder.Default private String severity = "info"; // info | success | warning | critical
    @Builder.Default private String ip       = "127.0.0.1";

    private Instant createdAt;
    private Instant updatedAt;
}
