package com.lifefile.scos.controller;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lifefile.scos.model.Appointment;
import com.lifefile.scos.model.Doctor;
import com.lifefile.scos.model.Patient;
import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.AppointmentRepository;
import com.lifefile.scos.repository.DoctorRepository;
import com.lifefile.scos.repository.PatientRepository;
import com.lifefile.scos.service.KafkaProducerService;
import com.lifefile.scos.util.MongoIdUtil;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * AppointmentController — replaces routes/appointments.js
 */
@Slf4j
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final MongoTemplate mongoTemplate;
    private final KafkaProducerService kafkaProducerService;

    /**
     * Check if appointment is older than 48 hours and mark it as Missed.
     */
    private boolean checkAndMarkIfStale48Hours(Appointment appt, Instant cutoff, ZoneId zone) {
        if (!"Pending".equalsIgnoreCase(appt.getStatus()) && !"Confirmed".equalsIgnoreCase(appt.getStatus())) {
            return false;
        }
        try {
            Instant apptInstant = parseAppointmentInstant(appt, zone);
            if (apptInstant != null && apptInstant.isBefore(cutoff)) {
                appt.setStatus("Missed");
                appt.setUpdatedAt(Instant.now());
                appointmentRepository.save(appt);
                return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    private Instant parseAppointmentInstant(Appointment appt, ZoneId zone) {
        if (appt.getDate() == null || appt.getDate().isBlank()) return null;
        try {
            LocalDate date = LocalDate.parse(appt.getDate());
            LocalTime time = LocalTime.MIDNIGHT;
            if (appt.getTime() != null && !appt.getTime().isBlank()) {
                String t = appt.getTime().trim();
                try {
                    time = LocalTime.parse(t, DateTimeFormatter.ofPattern("HH:mm"));
                } catch (DateTimeParseException e1) {
                    try {
                        time = LocalTime.parse(t.toUpperCase(), DateTimeFormatter.ofPattern("hh:mm a"));
                    } catch (DateTimeParseException ignored) {}
                }
            }
            return LocalDateTime.of(date, time).atZone(zone).toInstant();
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isPatientOwner(Appointment appt, User user) {
        if (appt.getPatientId() == null) return false;
        if (appt.getPatientId().equals(user.getId())) return true;
        Optional<Patient> p = patientRepository.findByUserId(user.getId());
        return p.isPresent() && appt.getPatientId().equals(p.get().getId());
    }

    @GetMapping
    public ResponseEntity<?> getAppointments(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String hospitalId,
            HttpServletRequest request) {

        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Instant cutoff = Instant.now().minusSeconds(48 * 3600);
        ZoneId zone = ZoneId.systemDefault();

        List<Appointment> appointments;
        switch (user.getRole() == null ? "" : user.getRole()) {
        case "patient" -> {
            List<String> targetIds = new ArrayList<>();
            targetIds.add(user.getId());
            patientRepository.findByUserId(user.getId()).ifPresent(p -> {
                if (p.getId() != null) targetIds.add(p.getId());
            });
            Query q = new Query(MongoIdUtil.idCriteria("patientId", targetIds));
            appointments = new ArrayList<>(mongoTemplate.find(q, Appointment.class));

            // Update any stale pending appointments to Missed
            for (Appointment a : appointments) {
                checkAndMarkIfStale48Hours(a, cutoff, zone);
            }
        }
        case "doctor" -> {
            List<String> targetIds = new ArrayList<>();
            targetIds.add(user.getId());
            doctorRepository.findByUserId(user.getId()).ifPresent(d -> {
                if (d.getId() != null) targetIds.add(d.getId());
            });
            Query q = new Query(MongoIdUtil.idCriteria("doctorId", targetIds));
            appointments = new ArrayList<>(mongoTemplate.find(q, Appointment.class));

            // Check stale appointments and mark as Missed
            for (Appointment a : appointments) {
                checkAndMarkIfStale48Hours(a, cutoff, zone);
            }

            // DOCTOR SIDE REQUIREMENT: Missed / expired appointments are automatically removed from doctor view
            // unless the doctor specifically asked for status=Missed
            if (status == null || !status.equalsIgnoreCase("Missed")) {
                appointments.removeIf(a -> "Missed".equalsIgnoreCase(a.getStatus()));
            }
        }
        default -> {
            appointments = new ArrayList<>(appointmentRepository.findAll());
            for (Appointment a : appointments) {
                checkAndMarkIfStale48Hours(a, cutoff, zone);
            }
        }
        }

        // Apply filters
        if (status != null && !status.isBlank()) {
            appointments.removeIf(a -> !status.equalsIgnoreCase(a.getStatus()));
        }
        if (hospitalId != null && !hospitalId.isBlank()) {
            appointments.removeIf(a -> !MongoIdUtil.matchesHospitalFilter(a.getHospitalId(), hospitalId));
        }

        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/missed")
    public ResponseEntity<?> getMissedAppointments(
            @RequestParam(required = false) String hospitalId,
            HttpServletRequest request) {

        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
        ZoneId zone = ZoneId.systemDefault();

        List<Appointment> list;
        switch (user.getRole() == null ? "" : user.getRole()) {
        case "patient" -> {
            List<String> targetIds = new ArrayList<>();
            targetIds.add(user.getId());
            patientRepository.findByUserId(user.getId()).ifPresent(p -> {
                if (p.getId() != null) targetIds.add(p.getId());
            });
            Query q = new Query(MongoIdUtil.idCriteria("patientId", targetIds));
            list = new ArrayList<>(mongoTemplate.find(q, Appointment.class));
        }
        case "doctor" -> {
            List<String> targetIds = new ArrayList<>();
            targetIds.add(user.getId());
            doctorRepository.findByUserId(user.getId()).ifPresent(d -> {
                if (d.getId() != null) targetIds.add(d.getId());
            });
            Query q = new Query(MongoIdUtil.idCriteria("doctorId", targetIds));
            list = new ArrayList<>(mongoTemplate.find(q, Appointment.class));
        }
        default -> {
            list = new ArrayList<>(appointmentRepository.findAll());
        }
        }

        // Keep appointments that are already 'Missed' or past appointment time with status Pending/Confirmed
        List<Appointment> missed = new ArrayList<>();

        for (Appointment a : list) {
            if ("Missed".equalsIgnoreCase(a.getStatus())) {
                missed.add(a);
            } else if ("Pending".equalsIgnoreCase(a.getStatus()) || "Confirmed".equalsIgnoreCase(a.getStatus())) {
                if (a.getDate() != null && a.getDate().compareTo(today) < 0) {
                    a.setStatus("Missed");
                    a.setUpdatedAt(Instant.now());
                    appointmentRepository.save(a);
                    missed.add(a);
                } else if (today.equals(a.getDate())) {
                    // Check time of day
                    Instant apptInstant = parseAppointmentInstant(a, zone);
                    if (apptInstant != null && apptInstant.isBefore(Instant.now())) {
                        missed.add(a);
                    }
                }
            }
        }

        if (hospitalId != null && !hospitalId.isBlank()) {
            missed.removeIf(a -> !MongoIdUtil.matchesHospitalFilter(a.getHospitalId(), hospitalId));
        }

        return ResponseEntity.ok(missed);
    }

    @PostMapping
    public ResponseEntity<?> bookAppointment(@RequestBody Appointment reqBody, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        // Calculate baseToken logic
        Query q = new Query(Criteria.where("date").is(reqBody.getDate())
                .andOperator(MongoIdUtil.idCriteria("doctorId", reqBody.getDoctorId())));
        List<Appointment> existing = mongoTemplate.find(q, Appointment.class);
        int maxToken = existing.stream().mapToInt(Appointment::getBaseToken).max().orElse(0);

        reqBody.setPatientId(user.getId());
        reqBody.setPatientName(user.getName());
        reqBody.setBaseToken(maxToken + 1);
        if (reqBody.getTriageLevel() == null) reqBody.setTriageLevel(1);
        if (reqBody.getStatus() == null) reqBody.setStatus("Pending");
        reqBody.setCreatedAt(Instant.now());
        reqBody.setUpdatedAt(Instant.now());

        Appointment appointment = appointmentRepository.save(reqBody);

        kafkaProducerService.publishAppointmentEvent(appointment.getId(), Map.of(
                "action", "BOOKED",
                "patientName", user.getName(),
                "doctorName", appointment.getDoctorName() != null ? appointment.getDoctorName() : ""
        ));

        return ResponseEntity.status(HttpStatus.CREATED).body(appointment);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> rescheduleAppointment(@PathVariable String id, @RequestBody Appointment updateData, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Appointment> aptOpt = appointmentRepository.findById(id);
        if (aptOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        Appointment appointment = aptOpt.get();
        if ("patient".equals(user.getRole()) && !isPatientOwner(appointment, user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (updateData.getDate() != null) appointment.setDate(updateData.getDate());
        if (updateData.getTime() != null) appointment.setTime(updateData.getTime());
        if (updateData.getStatus() != null) appointment.setStatus(updateData.getStatus());
        appointment.setUpdatedAt(Instant.now());

        appointment = appointmentRepository.save(appointment);

        kafkaProducerService.publishAppointmentEvent(appointment.getId(), Map.of("action", "RESCHEDULED"));
        return ResponseEntity.ok(appointment);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateAppointmentStatus(@PathVariable String id,
                                                     @RequestBody Map<String, String> body,
                                                     HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Appointment> aptOpt = appointmentRepository.findById(id);
        if (aptOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        Appointment appointment = aptOpt.get();
        if ("patient".equals(user.getRole()) && !isPatientOwner(appointment, user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String newStatus = body.get("status");
        String postponedDate = body.get("postponedDate");
        String postponedTime = body.get("postponedTime");

        if ("Postponed".equalsIgnoreCase(newStatus) && postponedDate != null && postponedTime != null) {
            Appointment newAppt = Appointment.builder()
                    .patientId(appointment.getPatientId())
                    .patientName(appointment.getPatientName())
                    .doctorId(appointment.getDoctorId())
                    .doctorName(appointment.getDoctorName())
                    .spec(appointment.getSpec())
                    .date(postponedDate)
                    .time(postponedTime)
                    .status("Confirmed")
                    .location(appointment.getLocation())
                    .hospitalId(appointment.getHospitalId())
                    .hospitalName(appointment.getHospitalName())
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            Appointment savedNew = appointmentRepository.save(newAppt);

            appointment.setStatus("Postponed");
            appointment.setPostponedTo(postponedDate);
            appointment.setUpdatedAt(Instant.now());
            appointmentRepository.save(appointment);

            kafkaProducerService.publishAppointmentEvent(savedNew.getId(), Map.of(
                    "action", "POSTPONED",
                    "oldAppointmentId", appointment.getId(),
                    "newAppointmentId", savedNew.getId()
            ));

            return ResponseEntity.ok(Map.of("old", appointment, "new", savedNew));
        }

        if (newStatus != null) {
            appointment.setStatus(newStatus);
            appointment.setUpdatedAt(Instant.now());
            appointmentRepository.save(appointment);
        }

        return ResponseEntity.ok(appointment);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelAppointment(@PathVariable String id, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Appointment> aptOpt = appointmentRepository.findById(id);
        if (aptOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        Appointment appointment = aptOpt.get();

        // Ownership check: patient can only touch their own appointments
        if ("patient".equals(user.getRole()) && !isPatientOwner(appointment, user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Direct requirement: Patient manually deletes a Missed appointment
        if ("patient".equals(user.getRole()) && "Missed".equalsIgnoreCase(appointment.getStatus())) {
            appointmentRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Missed appointment removed from your records"));
        }

        // Everyone else (doctor / admin / patient cancelling active appointment) → mark Cancelled
        appointment.setStatus("Cancelled");
        appointment.setUpdatedAt(Instant.now());
        appointmentRepository.save(appointment);

        kafkaProducerService.publishAppointmentEvent(id, Map.of("action", "CANCELLED"));
        return ResponseEntity.ok(Map.of("message", "Appointment cancelled"));
    }

    @PostMapping("/walkin")
    public ResponseEntity<?> createWalkin(@RequestBody Appointment reqBody, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || (!"doctor".equals(user.getRole()) && !"admin".equals(user.getRole()) && !"hospital".equals(user.getRole()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String doctorId = user.getId();
        String doctorName = user.getName();

        if ("doctor".equals(user.getRole())) {
            Optional<Doctor> doc = doctorRepository.findByUserId(user.getId());
            if (doc.isPresent()) {
                doctorId = doc.get().getId();
                doctorName = doc.get().getName();
            }
        }

        reqBody.setDoctorId(doctorId);
        reqBody.setDoctorName(doctorName);
        reqBody.setStatus("Confirmed");
        reqBody.setIsWalkin(true);
        if (reqBody.getDate() == null) reqBody.setDate(LocalDate.now().format(DateTimeFormatter.ISO_DATE));
        if (reqBody.getTriageLevel() == null) reqBody.setTriageLevel(1);
        reqBody.setCreatedAt(Instant.now());
        reqBody.setUpdatedAt(Instant.now());

        Query q = new Query(Criteria.where("date").is(reqBody.getDate())
                .andOperator(MongoIdUtil.idCriteria("doctorId", doctorId)));
        List<Appointment> existing = mongoTemplate.find(q, Appointment.class);
        int maxToken = existing.stream().mapToInt(Appointment::getBaseToken).max().orElse(0);
        reqBody.setBaseToken(maxToken + 1);

        Appointment appointment = appointmentRepository.save(reqBody);

        kafkaProducerService.publishAppointmentEvent(appointment.getId(), Map.of("action", "WALKIN_CREATED"));
        return ResponseEntity.status(HttpStatus.CREATED).body(appointment);
    }
}
