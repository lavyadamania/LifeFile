package com.lifefile.scos.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

/** JoinRequest document — mirrors models/JoinRequest.js */
@Document(collection = "joinrequests")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class JoinRequest {

    @Id private String id;

    private String doctorId;
    private String doctorName;
    private String hospitalId;
    private String hospitalName;
    @Builder.Default private String status = "pending"; // pending | approved | rejected

    private Instant createdAt;
    private Instant updatedAt;
}
