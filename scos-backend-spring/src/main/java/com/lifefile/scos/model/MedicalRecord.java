package com.lifefile.scos.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MedicalRecord document — mirrors models/MedicalRecord.js
 */
@Document(collection = "medicalrecords")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalRecord {

    @Id
    private String id;

    @JsonProperty("_id")
    public String get_id() { return id; }

    @JsonProperty("_id")
    public void set_id(String _id) { if (this.id == null) this.id = _id; }

    private String patientId; // can refer to Patient._id or User._id
    private String title;
    @Builder.Default private String type = "other"; // xray, mri, blood, other
    private String fileUrl;
    @Builder.Default private Boolean isPasswordProtected = false;
    private String password;

    private Instant createdAt;
    private Instant updatedAt;
}
