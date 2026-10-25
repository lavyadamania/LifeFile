package com.lifefile.scos.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/** Hospital document — mirrors models/Hospital.js */
@Document(collection = "hospitals")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Hospital {

    @Id
    private String id;

    @com.fasterxml.jackson.annotation.JsonProperty("_id")
    public String get_id() { return id; }

    @com.fasterxml.jackson.annotation.JsonProperty("_id")
    public void set_id(String _id) { if (this.id == null) this.id = _id; }

    private String userId;
    private String name;
    private String address;
    private String phone;
    @Builder.Default private String email       = "";
    @Builder.Default private String description = "";
    private List<String> departments;
    private List<String> doctors;               // ObjectId refs
    @Builder.Default private String status      = "active"; // active | maintenance

    private Instant createdAt;
    private Instant updatedAt;
}
