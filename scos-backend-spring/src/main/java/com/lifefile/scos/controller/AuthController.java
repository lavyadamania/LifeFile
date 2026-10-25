package com.lifefile.scos.controller;

import com.lifefile.scos.model.Doctor;
import com.lifefile.scos.model.Hospital;
import com.lifefile.scos.model.Patient;
import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.DoctorRepository;
import com.lifefile.scos.repository.HospitalRepository;
import com.lifefile.scos.repository.PatientRepository;
import com.lifefile.scos.repository.UserRepository;
import com.lifefile.scos.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * AuthController — replaces routes/auth.js
 *
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository     userRepository;
    private final DoctorRepository   doctorRepository;
    private final PatientRepository  patientRepository;
    private final HospitalRepository hospitalRepository;
    private final PasswordEncoder    passwordEncoder;
    private final JwtUtil            jwtUtil;

    // ─── POST /api/auth/register ────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> body) {
        try {
            String name     = (String) body.get("name");
            String email    = (String) body.get("email");
            String password = (String) body.get("password");
            String role     = (String) body.get("role");

            if (name == null || email == null || password == null || role == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "All fields are required"));
            }

            // Prevent privilege escalation to admin
            if (!List.of("patient", "doctor", "hospital").contains(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Invalid or unauthorized role for registration"));
            }

            if (userRepository.existsByEmail(email.toLowerCase())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
            }

            // Create user
            User user = User.builder()
                    .name(name)
                    .email(email.toLowerCase())
                    .password(passwordEncoder.encode(password))
                    .role(role)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            user = userRepository.save(user);

            // Auto-create role-specific profile
            if ("doctor".equals(role)) {
                String spec = (String) body.getOrDefault("specialization", "General Practice");
                String bio  = (String) body.getOrDefault("bio",
                        body.getOrDefault("title", "Senior Specialist") + " in " + spec);
                Doctor doctor = Doctor.builder()
                        .userId(user.getId())
                        .name(user.getName())
                        .specialization(spec)
                        .bio((String) bio)
                        .schedule(Doctor.Schedule.builder()
                                .isSameEveryday(true)
                                .days(defaultDays())
                                .build())
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
                doctorRepository.save(doctor);
            }

            if ("patient".equals(role)) {
                Patient patient = Patient.builder()
                        .userId(user.getId())
                        .name(user.getName())
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
                patientRepository.save(patient);
            }

            if ("hospital".equals(role)) {
                Hospital hospital = Hospital.builder()
                        .userId(user.getId())
                        .name(user.getName())
                        .address((String) body.getOrDefault("address", "Address pending"))
                        .phone((String) body.getOrDefault("phone", "Phone pending"))
                        .email(user.getEmail())
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
                hospitalRepository.save(hospital);
            }

            String token = jwtUtil.generateToken(user.getId());

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "token", token,
                    "user", Map.of(
                            "id",    user.getId(),
                            "name",  user.getName(),
                            "email", user.getEmail(),
                            "role",  user.getRole()
                    )
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ─── POST /api/auth/login ───────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try {
            String email    = body.get("email");
            String password = body.get("password");

            if (email == null || password == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));
            }

            User user = userRepository.findByEmail(email.toLowerCase()).orElse(null);
            if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid email or password"));
            }

            String token = jwtUtil.generateToken(user.getId());

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "user", Map.of(
                            "id",    user.getId(),
                            "name",  user.getName(),
                            "email", user.getEmail(),
                            "role",  user.getRole()
                    )
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ─── GET /api/auth/me ───────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        return ResponseEntity.ok(Map.of("user", Map.of(
                "id",    user.getId(),
                "name",  user.getName(),
                "email", user.getEmail(),
                "role",  user.getRole()
        )));
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private List<Doctor.DaySchedule> defaultDays() {
        return List.of(
                new Doctor.DaySchedule("Mon", true,  "09:00", "17:00"),
                new Doctor.DaySchedule("Tue", true,  "09:00", "17:00"),
                new Doctor.DaySchedule("Wed", true,  "09:00", "17:00"),
                new Doctor.DaySchedule("Thu", true,  "09:00", "17:00"),
                new Doctor.DaySchedule("Fri", true,  "09:00", "17:00"),
                new Doctor.DaySchedule("Sat", true,  "09:00", "17:00"),
                new Doctor.DaySchedule("Sun", false, "09:00", "17:00")
        );
    }
}
