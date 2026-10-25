package com.lifefile.scos.controller;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lifefile.scos.model.Doctor;
import com.lifefile.scos.model.Hospital;
import com.lifefile.scos.model.JoinRequest;
import com.lifefile.scos.model.Prescription;
import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.DoctorRepository;
import com.lifefile.scos.repository.HospitalRepository;
import com.lifefile.scos.repository.JoinRequestRepository;
import com.lifefile.scos.repository.PrescriptionRepository;
import com.lifefile.scos.repository.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

/**
 * HospitalController — replaces routes/hospitals.js
 */
@RestController
@RequestMapping("/api/hospitals")
@RequiredArgsConstructor
public class HospitalController {

    private final HospitalRepository hospitalRepository;
    private final DoctorRepository doctorRepository;
    private final JoinRequestRepository joinRequestRepository;
    private final UserRepository userRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Helper to populate doctors list on hospital representation
     */
    private Map<String, Object> toPopulatedHospitalMap(Hospital hospital) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", hospital.getId());
        map.put("_id", hospital.getId());
        map.put("userId", hospital.getUserId());
        map.put("name", hospital.getName());
        map.put("address", hospital.getAddress());
        map.put("mapsUrl", hospital.getMapsUrl());
        map.put("phone", hospital.getPhone());
        map.put("email", hospital.getEmail());
        map.put("description", hospital.getDescription());
        map.put("departments", hospital.getDepartments());
        map.put("status", hospital.getStatus());
        map.put("createdAt", hospital.getCreatedAt());
        map.put("updatedAt", hospital.getUpdatedAt());

        List<Doctor> docList = new ArrayList<>();
        if (hospital.getDoctors() != null && !hospital.getDoctors().isEmpty()) {
            docList = doctorRepository.findAllById(hospital.getDoctors());
        }
        map.put("doctors", docList);
        return map;
    }

    @GetMapping
    public ResponseEntity<?> getHospitals(@RequestParam(required = false) String search,
                                         @RequestParam(required = false) String department) {
        List<Hospital> hospitals = hospitalRepository.findAll();

        if (search != null && !search.isEmpty()) {
            String lowerSearch = search.toLowerCase();
            hospitals.removeIf(h -> !h.getName().toLowerCase().contains(lowerSearch) &&
                                    (h.getAddress() == null || !h.getAddress().toLowerCase().contains(lowerSearch)));
        }

        if (department != null && !department.isEmpty()) {
            String lowerDept = department.toLowerCase();
            hospitals.removeIf(h -> h.getDepartments() == null || h.getDepartments().stream().noneMatch(d -> d.toLowerCase().contains(lowerDept)));
        }

        List<Map<String, Object>> result = hospitals.stream()
                .map(this::toPopulatedHospitalMap)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyHospitalProfile(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"hospital".equals(user.getRole())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        Optional<Hospital> hospitalOpt = hospitalRepository.findByUserId(user.getId());
        if (hospitalOpt.isEmpty() && user.getEmail() != null) {
            hospitalOpt = hospitalRepository.findByEmail(user.getEmail());
            hospitalOpt.ifPresent(h -> {
                if (h.getUserId() == null || !h.getUserId().equals(user.getId())) {
                    h.setUserId(user.getId());
                    hospitalRepository.save(h);
                }
            });
        }

        if (hospitalOpt.isEmpty()) {
            Hospital newHospital = Hospital.builder()
                    .userId(user.getId())
                    .name(user.getName() != null ? user.getName() : "Hospital Facility")
                    .email(user.getEmail() != null ? user.getEmail() : "")
                    .address("Address pending")
                    .phone("Phone pending")
                    .description("Full Service Clinical Facility")
                    .departments(List.of("General Medicine", "Emergency Medicine"))
                    .status("active")
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            newHospital = hospitalRepository.save(newHospital);
            hospitalOpt = Optional.of(newHospital);
        }

        return ResponseEntity.ok(toPopulatedHospitalMap(hospitalOpt.get()));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMyHospitalProfile(@RequestBody Hospital updateData, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"hospital".equals(user.getRole())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        Optional<Hospital> hospitalOpt = hospitalRepository.findByUserId(user.getId());
        if (hospitalOpt.isEmpty() && user.getEmail() != null) {
            hospitalOpt = hospitalRepository.findByEmail(user.getEmail());
        }
        if (hospitalOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        Hospital hospital = hospitalOpt.get();
        if (updateData.getName() != null) hospital.setName(updateData.getName());
        if (updateData.getAddress() != null) hospital.setAddress(updateData.getAddress());
        if (updateData.getMapsUrl() != null) hospital.setMapsUrl(updateData.getMapsUrl().trim());
        if (updateData.getPhone() != null) hospital.setPhone(updateData.getPhone());
        if (updateData.getEmail() != null) hospital.setEmail(updateData.getEmail());
        if (updateData.getDescription() != null) hospital.setDescription(updateData.getDescription());
        if (updateData.getDepartments() != null) hospital.setDepartments(updateData.getDepartments());
        if (updateData.getStatus() != null) hospital.setStatus(updateData.getStatus());
        hospital.setUpdatedAt(Instant.now());

        Hospital saved = hospitalRepository.save(hospital);
        return ResponseEntity.ok(toPopulatedHospitalMap(saved));
    }

    @GetMapping("/me/requests")
    public ResponseEntity<?> getMyHospitalRequests(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"hospital".equals(user.getRole())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        Optional<Hospital> hospitalOpt = hospitalRepository.findByUserId(user.getId());
        if (hospitalOpt.isEmpty() && user.getEmail() != null) {
            hospitalOpt = hospitalRepository.findByEmail(user.getEmail());
        }
        if (hospitalOpt.isEmpty()) return ResponseEntity.ok(List.of());

        List<JoinRequest> requests = joinRequestRepository.findByHospitalId(hospitalOpt.get().getId());
        return ResponseEntity.ok(requests != null ? requests : List.of());
    }

    @PutMapping("/me/requests/{reqId}")
    public ResponseEntity<?> updateHospitalRequest(@PathVariable String reqId,
                                                   @RequestBody Map<String, String> body,
                                                   HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"hospital".equals(user.getRole())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        String status = body.get("status");
        if (!"approved".equals(status) && !"rejected".equals(status)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status"));
        }

        Optional<JoinRequest> reqOpt = joinRequestRepository.findById(reqId);
        if (reqOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        JoinRequest joinReq = reqOpt.get();

        Optional<Hospital> hospitalOpt = hospitalRepository.findByUserId(user.getId());
        if (hospitalOpt.isEmpty() && user.getEmail() != null) {
            hospitalOpt = hospitalRepository.findByEmail(user.getEmail());
        }
        if (hospitalOpt.isEmpty() || !joinReq.getHospitalId().equals(hospitalOpt.get().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        joinReq.setStatus(status);
        joinReq.setUpdatedAt(Instant.now());
        joinRequestRepository.save(joinReq);

        if ("approved".equals(status)) {
            Hospital hospital = hospitalOpt.get();
            Optional<Doctor> docOpt = doctorRepository.findById(joinReq.getDoctorId());
            if (docOpt.isPresent()) {
                Doctor doctor = docOpt.get();
                if (doctor.getHospitals() == null) doctor.setHospitals(new ArrayList<>());
                if (!doctor.getHospitals().contains(hospital.getId())) {
                    doctor.getHospitals().add(hospital.getId());
                    doctorRepository.save(doctor);
                }
                if (hospital.getDoctors() == null) hospital.setDoctors(new ArrayList<>());
                if (!hospital.getDoctors().contains(doctor.getId())) {
                    hospital.getDoctors().add(doctor.getId());
                    hospitalRepository.save(hospital);
                }
            }
        }

        return ResponseEntity.ok(joinReq);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getHospitalById(@PathVariable String id) {
        return hospitalRepository.findById(id)
                .map(h -> ResponseEntity.ok(toPopulatedHospitalMap(h)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    public ResponseEntity<?> createHospital(@RequestBody Hospital hospital, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"admin".equals(user.getRole())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        hospital.setCreatedAt(Instant.now());
        hospital.setUpdatedAt(Instant.now());
        Hospital saved = hospitalRepository.save(hospital);
        return ResponseEntity.status(HttpStatus.CREATED).body(toPopulatedHospitalMap(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateHospital(@PathVariable String id, @RequestBody Hospital updateData, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"admin".equals(user.getRole())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        Optional<Hospital> hospitalOpt = hospitalRepository.findById(id);
        if (hospitalOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        Hospital hospital = hospitalOpt.get();
        if (updateData.getName() != null) hospital.setName(updateData.getName());
        if (updateData.getAddress() != null) hospital.setAddress(updateData.getAddress());
        if (updateData.getPhone() != null) hospital.setPhone(updateData.getPhone());
        if (updateData.getEmail() != null) hospital.setEmail(updateData.getEmail());
        if (updateData.getDescription() != null) hospital.setDescription(updateData.getDescription());
        if (updateData.getDepartments() != null) hospital.setDepartments(updateData.getDepartments());
        if (updateData.getStatus() != null) hospital.setStatus(updateData.getStatus());
        hospital.setUpdatedAt(Instant.now());

        return ResponseEntity.ok(toPopulatedHospitalMap(hospitalRepository.save(hospital)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteHospital(@PathVariable String id, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"admin".equals(user.getRole())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        Optional<Hospital> hospitalOpt = hospitalRepository.findById(id);
        if (hospitalOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        // Remove hospital ref from doctors
        List<Doctor> doctors = doctorRepository.findByHospitalsContaining(id);
        for (Doctor d : doctors) {
            if (d.getHospitals() != null) {
                d.getHospitals().remove(id);
                doctorRepository.save(d);
            }
        }

        hospitalRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Hospital deleted"));
    }

    @PutMapping("/{id}/doctors")
    public ResponseEntity<?> modifyHospitalDoctors(@PathVariable String id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        Optional<Hospital> hospitalOpt = hospitalRepository.findById(id);

        if (hospitalOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        Hospital hospital = hospitalOpt.get();

        if (user == null || (!"admin".equals(user.getRole()) && !user.getId().equals(hospital.getUserId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String action = body.get("action");
        String doctorId = body.get("doctorId");

        Optional<Doctor> docOpt = doctorRepository.findById(doctorId);
        if (docOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        Doctor doctor = docOpt.get();

        if (hospital.getDoctors() == null) hospital.setDoctors(new ArrayList<>());
        if (doctor.getHospitals() == null) doctor.setHospitals(new ArrayList<>());

        switch (action) {
            case "add" -> {
                if (!hospital.getDoctors().contains(doctorId)) hospital.getDoctors().add(doctorId);
                if (!doctor.getHospitals().contains(id)) doctor.getHospitals().add(id);
            }
            case "remove" -> {
                hospital.getDoctors().remove(doctorId);
                doctor.getHospitals().remove(id);
            }
            default -> {
                return ResponseEntity.badRequest().body(Map.of("error", "action must be add or remove"));
            }
        }

        hospitalRepository.save(hospital);
        doctorRepository.save(doctor);
        return ResponseEntity.ok(toPopulatedHospitalMap(hospital));
    }

    @PostMapping("/{id}/hire")
    public ResponseEntity<?> hireDoctor(@PathVariable String id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        Optional<Hospital> hospitalOpt = hospitalRepository.findById(id);
        if (hospitalOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        Hospital hospital = hospitalOpt.get();

        if (currentUser == null || (!"admin".equals(currentUser.getRole()) && !currentUser.getId().equals(hospital.getUserId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String name = body.get("name");
        String email = body.get("email");
        String password = body.get("password");
        String specialization = body.getOrDefault("specialization", "General Practice");

        if (name == null || email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "name, email, and password are required"));
        }

        if (userRepository.findByEmail(email.toLowerCase()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }

        User newUser = User.builder()
                .name(name)
                .email(email.toLowerCase())
                .password(passwordEncoder.encode(password))
                .role("doctor")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        User savedUser = userRepository.save(newUser);

        List<Doctor.DaySchedule> defaultDays = List.of("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun").stream()
                .map(d -> Doctor.DaySchedule.builder()
                        .day(d)
                        .isAvailable(!d.equals("Sun"))
                        .startTime("09:00")
                        .endTime("17:00")
                        .build())
                .collect(Collectors.toList());

        Doctor newDoctor = Doctor.builder()
                .userId(savedUser.getId())
                .name(savedUser.getName())
                .specialization(specialization)
                .schedule(Doctor.Schedule.builder().isSameEveryday(true).days(defaultDays).build())
                .hospitals(new ArrayList<>(List.of(hospital.getId())))
                .build();
        Doctor savedDoctor = doctorRepository.save(newDoctor);

        if (hospital.getDoctors() == null) hospital.setDoctors(new ArrayList<>());
        hospital.getDoctors().add(savedDoctor.getId());
        Hospital updatedHospital = hospitalRepository.save(hospital);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Dr. " + name + " hired and affiliated with " + hospital.getName(),
                "doctor", savedDoctor,
                "hospital", toPopulatedHospitalMap(updatedHospital)
        ));
    }

    @PostMapping("/{id}/apply")
    public ResponseEntity<?> applyToHospital(@PathVariable String id, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"doctor".equals(user.getRole())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        Optional<Hospital> hospitalOpt = hospitalRepository.findById(id);
        if (hospitalOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        Hospital hospital = hospitalOpt.get();

        Optional<Doctor> docOpt = doctorRepository.findByUserId(user.getId());
        if (docOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Doctor profile not found"));
        Doctor doctor = docOpt.get();

        if (hospital.getDoctors() != null && hospital.getDoctors().contains(doctor.getId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "You are already in this hospital roster"));
        }

        Optional<JoinRequest> existing = joinRequestRepository.findByDoctorIdAndHospitalIdAndStatus(doctor.getId(), hospital.getId(), "pending");
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Application already pending"));
        }

        JoinRequest joinReq = JoinRequest.builder()
                .doctorId(doctor.getId())
                .doctorName(doctor.getName())
                .hospitalId(hospital.getId())
                .hospitalName(hospital.getName())
                .status("pending")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(joinRequestRepository.save(joinReq));
    }

    @PostMapping("/{id}/doctors/{doctorId}/unavailable")
    public ResponseEntity<?> markDoctorUnavailable(@PathVariable String id,
                                                    @PathVariable String doctorId,
                                                    @RequestBody Map<String, String> body,
                                                    HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        Optional<Hospital> hospitalOpt = hospitalRepository.findById(id);
        if (hospitalOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        Hospital hospital = hospitalOpt.get();

        if (user == null || (!"admin".equals(user.getRole()) && !user.getId().equals(hospital.getUserId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String date = body.get("date");
        String reason = body.getOrDefault("reason", "Holiday");
        if (date == null || date.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Date is required"));
        }

        Optional<Doctor> docOpt = doctorRepository.findById(doctorId);
        if (docOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        Doctor doctor = docOpt.get();

        if (doctor.getUnavailableDates() == null) doctor.setUnavailableDates(new ArrayList<>());
        doctor.getUnavailableDates().add(Doctor.UnavailableDate.builder()
                .date(date)
                .hospitalId(hospital.getId())
                .reason(reason)
                .build());

        return ResponseEntity.ok(doctorRepository.save(doctor));
    }

    @GetMapping("/{id}/records/{patientId}")
    public ResponseEntity<?> getHospitalPatientRecords(@PathVariable String id, @PathVariable String patientId) {
        List<Prescription> records = prescriptionRepository.findByHospitalIdAndPatientId(id, patientId);
        return ResponseEntity.ok(records);
    }
}
