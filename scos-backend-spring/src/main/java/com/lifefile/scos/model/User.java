package com.lifefile.scos.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * User document — mirrors models/User.js
 * Password hashing is handled by SecurityConfig.passwordEncoder() in AuthService.
 */
@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @com.fasterxml.jackson.annotation.JsonProperty("_id")
    public String get_id() { return id; }

    @com.fasterxml.jackson.annotation.JsonProperty("_id")
    public void set_id(String _id) { if (this.id == null) this.id = _id; }

    private String name;

    @Indexed(unique = true)
    private String email;

    private String password;

    /** Roles: admin | doctor | patient | hospital */
    private String role;

    private Instant createdAt;
    private Instant updatedAt;
}
