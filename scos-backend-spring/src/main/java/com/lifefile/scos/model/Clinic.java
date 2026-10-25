package com.lifefile.scos.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Clinic document — mirrors models/Clinic.js */
@Document(collection = "clinics")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Clinic {

    @Id private String id;

    private String name;
    private String doctorId;
    private String doctorName;
    private String address;
    private String mapsUrl;
    private String phone;
    @Builder.Default private Integer doctors = 0;
    @Builder.Default private String status = "active"; // active | maintenance

    private Instant createdAt;
    private Instant updatedAt;
}
