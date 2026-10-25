package com.lifefile.scos.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Review document — mirrors models/Review.js */
@Document(collection = "reviews")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Review {

    @Id private String id;

    private String doctorId;
    private String patientId;
    private String appointmentId;
    private Integer rating;  // 1–5
    @Builder.Default private String comment = "";

    private Instant createdAt;
    private Instant updatedAt;
}
