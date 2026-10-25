package com.lifefile.scos.controller;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lifefile.scos.model.Clinic;
import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.ClinicRepository;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

/**
 * ClinicController — replaces routes/clinics.js
 */
@RestController
@RequestMapping("/api/clinics")
@RequiredArgsConstructor
public class ClinicController {

    private final ClinicRepository clinicRepository;

    @GetMapping
    public ResponseEntity<?> getClinics(@RequestParam(required = false) String search) {
        List<Clinic> clinics = clinicRepository.findAll();

        if (search != null && !search.isEmpty()) {
            String lowerSearch = search.toLowerCase();
            clinics.removeIf(c -> !c.getName().toLowerCase().contains(lowerSearch) && 
                                  (c.getAddress() == null || !c.getAddress().toLowerCase().contains(lowerSearch)));
        }

        clinics.sort((a, b) -> {
            Instant left = a.getCreatedAt() == null ? Instant.EPOCH : a.getCreatedAt();
            Instant right = b.getCreatedAt() == null ? Instant.EPOCH : b.getCreatedAt();
            return right.compareTo(left);
        });
        return ResponseEntity.ok(clinics);
    }

    @PostMapping
    public ResponseEntity<?> createClinic(@RequestBody Clinic clinic, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"admin".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Instant now = Instant.now();
        clinic.setCreatedAt(now);
        clinic.setUpdatedAt(now);
        return ResponseEntity.status(HttpStatus.CREATED).body(clinicRepository.save(clinic));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateClinic(@PathVariable String id, @RequestBody Clinic updateData, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"admin".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Clinic> existing = clinicRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        updateData.setId(id);
        updateData.setCreatedAt(existing.get().getCreatedAt() == null ? Instant.now() : existing.get().getCreatedAt());
        updateData.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(clinicRepository.save(updateData));
    }
}
