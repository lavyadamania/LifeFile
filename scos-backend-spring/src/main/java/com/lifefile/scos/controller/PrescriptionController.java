package com.lifefile.scos.controller;

import com.lifefile.scos.model.Doctor;
import com.lifefile.scos.model.Prescription;
import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.DoctorRepository;
import com.lifefile.scos.repository.PatientRepository;
import com.lifefile.scos.repository.PrescriptionRepository;
import com.lifefile.scos.service.KafkaProducerService;
import com.lifefile.scos.util.MongoIdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * PrescriptionController — replaces routes/prescriptions.js
 */
@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionRepository prescriptionRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final MongoTemplate mongoTemplate;
    private final KafkaProducerService kafkaProducerService;

    @PostMapping("/upload-attachment")
    public ResponseEntity<?> uploadAttachment(
            @RequestParam("attachment") MultipartFile file,
            @RequestParam(value = "type", defaultValue = "other") String type,
            HttpServletRequest request) {

        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        if (file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No file uploaded"));

        try {
            String uploadDir = "uploads/attachments/";
            Path dirPath = Paths.get(uploadDir);
            if (!Files.exists(dirPath)) Files.createDirectories(dirPath);

            String filename = "att-" + System.currentTimeMillis() + "-" + file.getOriginalFilename();
            Path filePath = dirPath.resolve(filename);
            file.transferTo(new File(filePath.toAbsolutePath().toString()));

            String url = "/uploads/attachments/" + filename;
            return ResponseEntity.ok(Map.of(
                    "filename", file.getOriginalFilename(),
                    "url", url,
                    "type", type
            ));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getPatientPrescriptions(@PathVariable String patientId, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        List<String> targetIds = new ArrayList<>();
        targetIds.add(patientId);
        patientRepository.findById(patientId).ifPresent(p -> {
            if (p.getUserId() != null) targetIds.add(p.getUserId());
        });
        patientRepository.findByUserId(patientId).ifPresent(p -> {
            if (p.getId() != null) targetIds.add(p.getId());
        });

        Query query = new Query(MongoIdUtil.idCriteria("patientId", targetIds))
                .with(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Prescription> prescriptions = mongoTemplate.find(query, Prescription.class);
        return ResponseEntity.ok(prescriptions);
    }

    @GetMapping("/hospital/{hospitalId}/patient/{patientId}")
    public ResponseEntity<?> getHospitalPatientPrescriptions(
            @PathVariable String hospitalId,
            @PathVariable String patientId,
            HttpServletRequest request) {

        List<String> targetIds = new ArrayList<>();
        targetIds.add(patientId);
        patientRepository.findById(patientId).ifPresent(p -> {
            if (p.getUserId() != null) targetIds.add(p.getUserId());
        });
        patientRepository.findByUserId(patientId).ifPresent(p -> {
            if (p.getId() != null) targetIds.add(p.getId());
        });

        Query query = new Query(new Criteria().andOperator(
                MongoIdUtil.idCriteria("hospitalId", hospitalId),
                MongoIdUtil.idCriteria("patientId", targetIds)
        )).with(Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Prescription> prescriptions = mongoTemplate.find(query, Prescription.class);
        return ResponseEntity.ok(prescriptions);
    }

    @GetMapping
    public ResponseEntity<?> getPrescriptions(@RequestParam(required = false) String hospitalId, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        List<Prescription> prescriptions;

        if ("patient".equals(user.getRole())) {
            List<String> targetIds = new ArrayList<>();
            targetIds.add(user.getId());
            patientRepository.findByUserId(user.getId()).ifPresent(p -> {
                if (p.getId() != null) targetIds.add(p.getId());
            });
            Query query = new Query(MongoIdUtil.idCriteria("patientId", targetIds))
                    .with(Sort.by(Sort.Direction.DESC, "createdAt"));
            prescriptions = new ArrayList<>(mongoTemplate.find(query, Prescription.class));
        } else if ("doctor".equals(user.getRole())) {
            List<String> targetIds = new ArrayList<>();
            targetIds.add(user.getId());
            doctorRepository.findByUserId(user.getId()).ifPresent(d -> {
                if (d.getId() != null) targetIds.add(d.getId());
            });
            Query query = new Query(MongoIdUtil.idCriteria("doctorId", targetIds))
                    .with(Sort.by(Sort.Direction.DESC, "createdAt"));
            prescriptions = new ArrayList<>(mongoTemplate.find(query, Prescription.class));
        } else {
            prescriptions = new ArrayList<>(prescriptionRepository.findAll());
        }

        if (hospitalId != null && !hospitalId.isBlank()) {
            prescriptions.removeIf(p -> !MongoIdUtil.matchesHospitalFilter(p.getHospitalId(), hospitalId));
        }

        return ResponseEntity.ok(prescriptions);
    }

    @PostMapping
    public ResponseEntity<?> createPrescription(@RequestBody Prescription data, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        if (data.getPatientId() == null || data.getPatientId().equals("new") || data.getPatientId().length() < 12) {
            data.setPatientId(null);
        }

        if ("doctor".equals(user.getRole())) {
            Optional<Doctor> docProfile = doctorRepository.findByUserId(user.getId());
            data.setDoctorId(docProfile.isPresent() ? docProfile.get().getId() : user.getId());
            data.setDoctorName(docProfile.isPresent() ? docProfile.get().getName() : user.getName());
        } else {
            if (data.getDoctorId() == null || data.getDoctorId().equals("DOC-1") || data.getDoctorId().length() < 12) {
                data.setDoctorId(user.getId());
            }
            if (data.getDoctorName() == null) data.setDoctorName(user.getName());
        }

        Prescription saved = prescriptionRepository.save(data);

        kafkaProducerService.publishPrescriptionEvent(saved.getId(), Map.of(
                "action", "PRESCRIPTION_CREATED",
                "doctorName", saved.getDoctorName(),
                "patientName", saved.getPatientName() != null ? saved.getPatientName() : "Walk-in Patient",
                "diagnosis", saved.getDiagnosis() != null ? saved.getDiagnosis() : ""
        ));

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
