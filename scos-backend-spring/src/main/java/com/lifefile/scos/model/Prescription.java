package com.lifefile.scos.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/** Prescription document — mirrors models/Prescription.js */
@Document(collection = "prescriptions")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Prescription {

    @Id
    private String id;

    private String patientId;
    private String doctorId;
    @Builder.Default private String patientName  = "";
    @Builder.Default private String doctorName   = "";
    @Builder.Default private String diagnosis    = "";
    @Builder.Default private String notes        = "";
    private List<Medication> medications;
    private String hospitalId;
    @Builder.Default private String hospitalName = "";
    private List<Attachment> attachments;

    private Instant createdAt;
    private Instant updatedAt;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class Medication {
        private String name;
        private String dosage;
        private String frequency;
        private String duration;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class Attachment {
        private String filename;
        private String url;
        private String type; // xray | lab | mri | other
    }
}
