package com.lifefile.scos.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Appointment document — mirrors models/Appointment.js
 * Status: Confirmed | Pending | Cancelled | Rescheduled | Completed | Missed | Postponed | In_Progress
 */
@Document(collection = "appointments")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Appointment {

    @Id
    private String id;

    @com.fasterxml.jackson.annotation.JsonProperty("_id")
    public String get_id() { return id; }

    @com.fasterxml.jackson.annotation.JsonProperty("_id")
    public void set_id(String _id) { if (this.id == null) this.id = _id; }

    private String patientId;   // ref User
    @Builder.Default private String patientName = "";
    private String doctorId;    // ref Doctor
    private String doctorName;
    @Builder.Default private String spec        = "";
    private String date;        // "YYYY-MM-DD"
    private String time;        // "HH:mm"
    @Builder.Default private String status      = "Pending";
    @Builder.Default private String location    = "Main Clinic";
    @Builder.Default private String postponedTo = "";
    @Builder.Default private Boolean isWalkin   = false;
    private String hospitalId;
    @Builder.Default private String hospitalName = "";
    @Builder.Default private Integer baseToken   = 0;
    @Builder.Default private Integer triageLevel = 1;  // 1–5
    @Builder.Default private Integer missedCalls = 0;
    @Builder.Default private String chiefComplaint = "";

    private Instant createdAt;
    private Instant updatedAt;
}
