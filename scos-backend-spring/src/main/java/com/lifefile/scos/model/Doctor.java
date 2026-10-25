package com.lifefile.scos.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/**
 * Doctor document — mirrors models/Doctor.js
 */
@Document(collection = "doctors")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Doctor {

    @Id
    private String id;

    @com.fasterxml.jackson.annotation.JsonProperty("_id")
    public String get_id() { return id; }

    @com.fasterxml.jackson.annotation.JsonProperty("_id")
    public void set_id(String _id) { if (this.id == null) this.id = _id; }

    private String userId;
    private String name;
    private String specialization;

    @Builder.Default
    private String status = "Active"; // Active | On Leave

    @Builder.Default
    private String hours = "Mon-Fri, 9AM-5PM";

    private Schedule schedule;

    @Builder.Default
    private Double rating = 0.0;

    @Builder.Default
    private Integer reviewCount = 0;

    @Builder.Default
    private String location = "Main Clinic";

    @Builder.Default
    private String nextSlot = "";

    @Builder.Default
    private String bio = "";

    @Builder.Default
    private Integer experience = 0;

    private List<Education> educations;
    private List<Experience> experiences;
    private List<Certification> certifications;
    private List<String> skills;
    private List<String> hospitals;       // ObjectId refs
    private List<UnavailableDate> unavailableDates;

    @Builder.Default
    private String signatureImage = "";

    private PrescriptionTemplate prescriptionTemplate;

    private Instant createdAt;
    private Instant updatedAt;

    // ── Nested types ──────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Schedule {
        @Builder.Default private Boolean isSameEveryday = true;
        private List<DaySchedule> days;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DaySchedule {
        private String  day;
        private Boolean isAvailable;
        private String  startTime;
        private String  endTime;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Education {
        private String degree;
        private String institution;
        private String year;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Experience {
        private String title;
        private String hospital;
        private String duration;
        private String description;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Certification {
        private String name;
        private String issuer;
        private String year;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UnavailableDate {
        private String date;
        private String hospitalId;
        @Builder.Default private String reason = "";
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PrescriptionTemplate {
        @Builder.Default private String clinicName    = "LifeFile";
        @Builder.Default private String clinicAddress = "123 Health Ave, Medical District, NY 10001";
        @Builder.Default private String clinicPhone   = "(555) 123-4567";
    }
}
