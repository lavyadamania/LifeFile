package com.lifefile.scos.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;
import java.util.List;

/**
 * PatientMemory document — mirrors models/PatientMemory.js
 * AI-powered memory engine entries for patients.
 */
@Document(collection = "patientmemories")
@CompoundIndex(def = "{'patientId': 1, 'category': 1, 'status': 1}")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PatientMemory {

    @Id
    private String id;

    @Indexed
    private String patientId;  // ref User

    /** ALLERGY | CONDITION | MEDICATION | PROCEDURE | INVESTIGATION | PREFERENCE */
    private String category;

    /** FACT | PREFERENCE | INFERENCE | TEMPORARY_CONTEXT */
    @Builder.Default private String type = "FACT";

    private String content;

    @Indexed
    private String normalizedContent;

    private List<String> sourceRecordIds;  // ref Prescription

    /** UNVERIFIED | SUPPORTED | VERIFIED | CONFLICTED */
    @Builder.Default private String confidence = "SUPPORTED";

    /** ACTIVE | INACTIVE | SUPERSEDED | CONFLICTED */
    @Indexed
    @Builder.Default private String status = "ACTIVE";

    @Builder.Default private Instant validFrom  = Instant.now();
    private Instant validUntil;

    @Builder.Default private String conflictNotes = "";

    private Instant createdAt;
    private Instant updatedAt;
}
