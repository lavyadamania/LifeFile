package com.lifefile.scos.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/** Patient document — mirrors models/Patient.js */
@Document(collection = "patients")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Patient {

    @Id
    private String id;

    @com.fasterxml.jackson.annotation.JsonProperty("_id")
    public String get_id() { return id; }

    @com.fasterxml.jackson.annotation.JsonProperty("_id")
    public void set_id(String _id) { if (this.id == null) this.id = _id; }

    private String userId;
    private String name;

    @Builder.Default private String phone            = "";
    @Builder.Default private String address          = "";
    @Builder.Default private String emergencyContact = "";
    private Integer age;
    @Builder.Default private String gender           = "";
    @Builder.Default private String height           = "";
    @Builder.Default private String weight           = "";
    @Builder.Default private String bloodGroup       = "";

    private List<String> grantedDoctors;  // ObjectId refs to Doctor
    private String currentHospital;       // ObjectId ref to Hospital
    private List<HospitalHistory> hospitalHistory;

    private Instant createdAt;
    private Instant updatedAt;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class HospitalHistory {
        private String hospitalId;
        private String hospitalName;
        private Instant joinedAt;
        private Instant leftAt;
    }
}
