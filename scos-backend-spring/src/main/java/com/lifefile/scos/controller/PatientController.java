package com.lifefile.scos.controller;

import com.lifefile.scos.model.Hospital;
import com.lifefile.scos.model.MedicalRecord;
import com.lifefile.scos.model.Patient;
import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.HospitalRepository;
import com.lifefile.scos.repository.MedicalRecordRepository;
import com.lifefile.scos.repository.PatientRepository;
import com.lifefile.scos.repository.UserRepository;
import com.lifefile.scos.service.MemoryService;
import com.lifefile.scos.util.MongoIdUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * PatientController — replaces routes/patients.js
 */
@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final HospitalRepository hospitalRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final MongoTemplate mongoTemplate;
    private final PasswordEncoder passwordEncoder;
    private final MemoryService memoryService;

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Patient> patient = patientRepository.findByUserId(user.getId());
        return patient.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchPatients(@RequestParam String q, HttpServletRequest request) {
        if (q == null || q.isEmpty()) return ResponseEntity.ok(List.of());

        List<User> users = userRepository.findAll().stream()
                .filter(u -> "patient".equals(u.getRole()))
                .filter(u -> u.getName() != null && u.getName().toLowerCase().contains(q.toLowerCase()))
                .limit(10)
                .collect(Collectors.toList());

        // Return simplified user objects
        List<Map<String, String>> results = users.stream()
                .map(u -> Map.of("id", u.getId(), "name", u.getName(), "email", u.getEmail()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPatientById(@PathVariable String id, HttpServletRequest request) {
        if (id == null || !ObjectId.isValid(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Optional<Patient> patient = patientRepository.findById(id);
        if (patient.isEmpty()) {
            // Patient search returns User IDs, while several consumers store
            // Patient profile IDs. Accept either identifier consistently.
            patient = patientRepository.findByUserId(id);
        }

        return patient.map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/{id}/ai-summary")
    public ResponseEntity<?> getPatientAISummary(@PathVariable String id, HttpServletRequest request) {
        String summary = memoryService.generatePatientAISummary(id);
        if (summary == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Patient profile not found"));
        }
        return ResponseEntity.ok(Map.of("summary", summary));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMyProfile(@RequestBody Patient updateData, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Patient> patientOpt = patientRepository.findByUserId(user.getId());
        if (patientOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        Patient patient = patientOpt.get();
        // Safe update - prevent modifying immutable fields like history
        if (updateData.getName() != null) patient.setName(updateData.getName());
        if (updateData.getPhone() != null) patient.setPhone(updateData.getPhone());
        if (updateData.getAddress() != null) patient.setAddress(updateData.getAddress());
        if (updateData.getEmergencyContact() != null) patient.setEmergencyContact(updateData.getEmergencyContact());
        if (updateData.getAge() != null) patient.setAge(updateData.getAge());
        if (updateData.getGender() != null) patient.setGender(updateData.getGender());
        if (updateData.getHeight() != null) patient.setHeight(updateData.getHeight());
        if (updateData.getWeight() != null) patient.setWeight(updateData.getWeight());
        if (updateData.getBloodGroup() != null) patient.setBloodGroup(updateData.getBloodGroup());
        patient.setUpdatedAt(Instant.now());

        return ResponseEntity.ok(patientRepository.save(patient));
    }

    @PutMapping("/me/hospital")
    public ResponseEntity<?> transferHospital(@RequestBody Map<String, String> body, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Patient> patientOpt = patientRepository.findByUserId(user.getId());
        if (patientOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        Patient patient = patientOpt.get();
        String hospitalId = body.get("hospitalId");

        if (patient.getHospitalHistory() == null) {
            patient.setHospitalHistory(new ArrayList<>());
        }

        // Close current hospital history entry if open
        if (patient.getCurrentHospital() != null) {
            for (Patient.HospitalHistory h : patient.getHospitalHistory()) {
                if (patient.getCurrentHospital().equals(h.getHospitalId()) && h.getLeftAt() == null) {
                    h.setLeftAt(Instant.now());
                }
            }
        }

        if (hospitalId != null && !hospitalId.isBlank()) {
            String hospitalName = "";
            Optional<Hospital> hOpt = hospitalRepository.findById(hospitalId);
            if (hOpt.isPresent()) {
                hospitalName = hOpt.get().getName();
            }

            patient.setCurrentHospital(hospitalId);
            Patient.HospitalHistory newEntry = new Patient.HospitalHistory(hospitalId, hospitalName, Instant.now(), null);
            patient.getHospitalHistory().add(newEntry);
        } else {
            patient.setCurrentHospital(null);
        }

        patient.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(patientRepository.save(patient));
    }

    // --- Medical Records Endpoints ---

    @PostMapping("/records")
    public ResponseEntity<?> createMedicalRecord(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Patient> patientOpt = patientRepository.findByUserId(user.getId());
        String targetPatientId = patientOpt.map(Patient::getId).orElse(user.getId());

        String title = (String) body.get("title");
        String type = (String) body.getOrDefault("type", "other");
        String fileUrl = (String) body.get("fileUrl");
        String rawPassword = (String) body.get("password");

        boolean isProtected = rawPassword != null && !rawPassword.trim().isEmpty();
        String hashedPassword = isProtected ? passwordEncoder.encode(rawPassword) : null;

        MedicalRecord record = MedicalRecord.builder()
                .patientId(targetPatientId)
                .title(title)
                .type(type)
                .fileUrl(fileUrl)
                .isPasswordProtected(isProtected)
                .password(hashedPassword)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        MedicalRecord saved = medicalRecordRepository.save(record);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", saved.getId());
        resp.put("_id", saved.getId());
        resp.put("patientId", saved.getPatientId());
        resp.put("title", saved.getTitle());
        resp.put("type", saved.getType());
        if (!Boolean.TRUE.equals(saved.getIsPasswordProtected())) {
            resp.put("fileUrl", saved.getFileUrl());
        }
        resp.put("isPasswordProtected", saved.getIsPasswordProtected());
        resp.put("createdAt", saved.getCreatedAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    @GetMapping("/records")
    public ResponseEntity<?> getMedicalRecords(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        List<String> targetIds = new ArrayList<>();
        targetIds.add(user.getId());
        patientRepository.findByUserId(user.getId()).ifPresent(p -> {
            if (p.getId() != null) targetIds.add(p.getId());
        });

        Query query = new Query(MongoIdUtil.idCriteria("patientId", targetIds))
                .with(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<MedicalRecord> records = mongoTemplate.find(query, MedicalRecord.class);

        List<Map<String, Object>> safeRecords = records.stream().map(r -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", r.getId());
            map.put("_id", r.getId());
            map.put("patientId", r.getPatientId());
            map.put("title", r.getTitle());
            map.put("type", r.getType());
            map.put("isPasswordProtected", Boolean.TRUE.equals(r.getIsPasswordProtected()));
            if (!Boolean.TRUE.equals(r.getIsPasswordProtected())) {
                map.put("fileUrl", r.getFileUrl());
            }
            map.put("createdAt", r.getCreatedAt());
            map.put("updatedAt", r.getUpdatedAt());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(safeRecords);
    }

    @PostMapping("/records/{id}/verify")
    public ResponseEntity<?> verifyMedicalRecordPassword(@PathVariable String id,
                                                         @RequestBody Map<String, String> body,
                                                         HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<MedicalRecord> recordOpt = medicalRecordRepository.findById(id);
        if (recordOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        MedicalRecord record = recordOpt.get();
        if (!Boolean.TRUE.equals(record.getIsPasswordProtected())) {
            return ResponseEntity.ok(Map.of("fileUrl", record.getFileUrl() != null ? record.getFileUrl() : ""));
        }

        String inputPassword = body.get("password");
        if (inputPassword == null) inputPassword = "";

        boolean matches = false;
        if (record.getPassword() != null) {
            matches = passwordEncoder.matches(inputPassword, record.getPassword())
                    || inputPassword.equals(record.getPassword());
        }

        if (!matches) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid password"));
        }

        return ResponseEntity.ok(Map.of("fileUrl", record.getFileUrl() != null ? record.getFileUrl() : ""));
    }
}
