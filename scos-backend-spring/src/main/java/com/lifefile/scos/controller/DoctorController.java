package com.lifefile.scos.controller;

import com.lifefile.scos.model.Doctor;
import com.lifefile.scos.model.JoinRequest;
import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.DoctorRepository;
import com.lifefile.scos.repository.JoinRequestRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * DoctorController — replaces routes/doctors.js
 */
@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorRepository doctorRepository;
    private final JoinRequestRepository joinRequestRepository;

    @GetMapping
    public ResponseEntity<List<Doctor>> getAllDoctors(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String spec,
            @RequestParam(required = false) String hospitalId) {

        List<Doctor> doctors;
        if (hospitalId != null) {
            doctors = doctorRepository.findByHospitalsContaining(hospitalId);
        } else if (search != null && !search.isEmpty()) {
            doctors = doctorRepository.findByNameContainingIgnoreCase(search);
        } else {
            doctors = doctorRepository.findAll();
        }

        if (spec != null && !spec.equals("All")) {
            doctors = doctors.stream()
                    .filter(d -> spec.equalsIgnoreCase(d.getSpecialization()))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(doctors);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Doctor> doctor = doctorRepository.findByUserId(user.getId());
        return doctor.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PutMapping("/me/schedule")
    public ResponseEntity<?> updateMySchedule(@RequestBody Doctor.Schedule schedule,
                                               HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"doctor".equalsIgnoreCase(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Doctor> doctor = doctorRepository.findByUserId(user.getId());
        if (doctor.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        Doctor existing = doctor.get();
        if (schedule == null || schedule.getDays() == null || schedule.getDays().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A schedule with at least one day is required"));
        }

        existing.setSchedule(schedule);
        existing.setUpdatedAt(java.time.Instant.now());
        return ResponseEntity.ok(doctorRepository.save(existing));
    }

    @PutMapping("/me/private-schedule")
    public ResponseEntity<?> updateMyPrivateSchedule(@RequestBody Doctor.Schedule schedule,
                                                      HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"doctor".equalsIgnoreCase(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Doctor> doctor = doctorRepository.findByUserId(user.getId());
        if (doctor.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        if (schedule == null || schedule.getDays() == null || schedule.getDays().size() != 7) {
            return ResponseEntity.badRequest().body(Map.of("error", "Private clinic schedule must include all seven days"));
        }
        Set<String> expectedDays = Set.of("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun");
        Set<String> suppliedDays = schedule.getDays().stream().map(Doctor.DaySchedule::getDay).collect(Collectors.toSet());
        if (!expectedDays.equals(suppliedDays)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Private clinic schedule must contain each weekday once"));
        }
        try {
            for (Doctor.DaySchedule day : schedule.getDays()) {
                if (!Boolean.TRUE.equals(day.getIsAvailable())) continue;
                LocalTime start = LocalTime.parse(day.getStartTime());
                LocalTime end = LocalTime.parse(day.getEndTime());
                if (!start.isBefore(end)) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Each open day must end after it starts"));
                }
            }
        } catch (DateTimeParseException | NullPointerException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Enter valid start and end times for open days"));
        }

        Doctor existing = doctor.get();
        existing.setPrivateSchedule(schedule);
        existing.setUpdatedAt(java.time.Instant.now());
        return ResponseEntity.ok(doctorRepository.save(existing));
    }

    @GetMapping("/me/requests")
    public ResponseEntity<?> getMyRequests(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"doctor".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Doctor> doctor = doctorRepository.findByUserId(user.getId());
        if (doctor.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        List<JoinRequest> requests = joinRequestRepository.findByDoctorId(doctor.get().getId());
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDoctorById(@PathVariable String id) {
        return doctorRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    public ResponseEntity<?> createDoctor(@RequestBody Doctor doctor, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"admin".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(doctorRepository.save(doctor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDoctor(@PathVariable String id, @RequestBody Doctor updateData, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || (!"admin".equals(user.getRole()) && !"doctor".equals(user.getRole()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Doctor> existing = doctorRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        if ("doctor".equals(user.getRole()) && !existing.get().getUserId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        updateData.setId(id);
        // Ensure userId remains unchanged
        updateData.setUserId(existing.get().getUserId());
        if (updateData.getSchedule() == null) {
            updateData.setSchedule(existing.get().getSchedule());
        }
        if (updateData.getPrivateSchedule() == null) {
            updateData.setPrivateSchedule(existing.get().getPrivateSchedule());
        }

        return ResponseEntity.ok(doctorRepository.save(updateData));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDoctor(@PathVariable String id, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"admin".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        doctorRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Doctor removed"));
    }

    @PostMapping("/upload-signature")
    public ResponseEntity<?> uploadSignature(@RequestParam("signature") MultipartFile file, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        if (file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No file uploaded"));

        try {
            String uploadDir = "uploads/signatures/";
            Path dirPath = Paths.get(uploadDir);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }

            String filename = "sig-" + user.getId() + "-" + System.currentTimeMillis() + ".jpg";
            Path filePath = dirPath.resolve(filename);
            file.transferTo(new File(filePath.toAbsolutePath().toString()));

            String url = "/uploads/signatures/" + filename;

            Optional<Doctor> doctorOpt = doctorRepository.findByUserId(user.getId());
            if (doctorOpt.isPresent()) {
                Doctor doctor = doctorOpt.get();
                doctor.setSignatureImage(url);
                doctorRepository.save(doctor);
            }

            return ResponseEntity.ok(Map.of("url", url));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
