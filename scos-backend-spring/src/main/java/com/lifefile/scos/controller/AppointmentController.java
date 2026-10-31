package com.lifefile.scos.controller;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Locale;
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

    private boolean isPatientOwner(Appointment appt, User user) {
        if (appt.getPatientId() == null) return false;
        if (appt.getPatientId().equals(user.getId())) return true;
        Optional<Patient> p = patientRepository.findByUserId(user.getId());
        return p.isPresent() && appt.getPatientId().equals(p.get().getId());
    }

    private String validateWorkingHours(Doctor doctor, String hospitalId, String date, String time) {
        boolean privateClinicBooking = hospitalId == null || hospitalId.isBlank();
        Doctor.Schedule schedule = privateClinicBooking ? doctor.getPrivateSchedule() : doctor.getSchedule();
        if (privateClinicBooking && schedule == null) {
            return "This doctor has not configured private clinic working hours";
        }

        try {
            LocalDate appointmentDate = LocalDate.parse(date);
            String normalizedTime = time.trim().toUpperCase(Locale.ROOT);
            LocalTime appointmentTime = normalizedTime.endsWith("AM") || normalizedTime.endsWith("PM")
                    ? LocalTime.parse(normalizedTime, DateTimeFormatter.ofPattern("h:mm a", Locale.US))
                    : LocalTime.parse(normalizedTime, DateTimeFormatter.ofPattern("H:mm", Locale.US));

            Doctor.DaySchedule daySchedule = null;
            if (schedule != null && schedule.getDays() != null && !schedule.getDays().isEmpty()) {
                String dayName = appointmentDate.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.US);
                daySchedule = Boolean.TRUE.equals(schedule.getIsSameEveryday())
                        ? schedule.getDays().get(0)
                        : schedule.getDays().stream().filter(d -> dayName.equalsIgnoreCase(d.getDay())).findFirst().orElse(null);
            }

            if (daySchedule == null) {
                if (privateClinicBooking) return "Private clinic hours are not configured for this day";
                // Preserve the existing hospital fallback for older doctor profiles.
                return appointmentTime.isBefore(LocalTime.of(9, 0)) || !appointmentTime.isBefore(LocalTime.of(17, 0))
                        ? "Appointment time is outside hospital working hours (09:00–17:00)" : null;
            }
            if (!Boolean.TRUE.equals(daySchedule.getIsAvailable())) {
                return privateClinicBooking ? "Private clinic is closed on this day" : "Hospital schedule is closed on this day";
            }

            LocalTime start = LocalTime.parse(daySchedule.getStartTime());
            LocalTime end = LocalTime.parse(daySchedule.getEndTime());
            if (appointmentTime.isBefore(start) || !appointmentTime.isBefore(end)) {
                return "Appointment time must be within " + start + "–" + end
                        + (privateClinicBooking ? " private clinic hours" : " hospital hours");
            }
            return null;
        } catch (DateTimeParseException | NullPointerException ex) {
            return "Appointment date or time is invalid";
        }
    }

    private Optional<Doctor> findDoctorForAppointment(Appointment appointment) {
        Optional<Doctor> byId = doctorRepository.findById(appointment.getDoctorId());
        return byId.isPresent() ? byId : doctorRepository.findByUserId(appointment.getDoctorId());
    }

    /** Prevent one patient from entering the same doctor's same-facility daily queue twice. */
    private boolean hasDuplicateActiveAppointment(String patientId, Doctor doctor, String date,
                                                   String hospitalId, String exceptAppointmentId) {
        if (patientId == null || patientId.isBlank() || doctor == null || date == null || date.isBlank()) {
            return false;
        }

        List<String> doctorIds = new ArrayList<>();
        if (doctor.getId() != null) doctorIds.add(doctor.getId());
        if (doctor.getUserId() != null) doctorIds.add(doctor.getUserId());
        Query query = new Query(new Criteria().andOperator(
                MongoIdUtil.idCriteria("doctorId", doctorIds),
                Criteria.where("date").is(date)));

        return mongoTemplate.find(query, Appointment.class).stream().anyMatch(existing -> {
            if (exceptAppointmentId != null && exceptAppointmentId.equals(existing.getId())) return false;
            if (!List.of("Confirmed", "Pending", "In_Progress", "Rescheduled").contains(existing.getStatus())) return false;
            return sameAppointmentId(patientId, existing.getPatientId())
                    && sameAppointmentId(hospitalId, existing.getHospitalId());
        });
    }

    private boolean sameAppointmentId(String left, String right) {
        boolean leftEmpty = left == null || left.isBlank();
        boolean rightEmpty = right == null || right.isBlank();
        if (leftEmpty || rightEmpty) return leftEmpty && rightEmpty;
        return left.trim().equalsIgnoreCase(right.trim());
    }

    private ResponseEntity<?> duplicateAppointmentResponse() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "This patient already has an active appointment with this doctor at this facility on this date"));
    }

    @GetMapping
    public ResponseEntity<?> getAppointments(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String hospitalId,
            HttpServletRequest request) {

        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

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

        }
        case "doctor" -> {
            List<String> targetIds = new ArrayList<>();
            targetIds.add(user.getId());
            doctorRepository.findByUserId(user.getId()).ifPresent(d -> {
                if (d.getId() != null) targetIds.add(d.getId());
            });
            Query q = new Query(MongoIdUtil.idCriteria("doctorId", targetIds));
            appointments = new ArrayList<>(mongoTemplate.find(q, Appointment.class));

            // Keep missed appointments out of the regular doctor view unless
            // the doctor explicitly requests status=Missed.
            if (status == null || !status.equalsIgnoreCase("Missed")) {
                appointments.removeIf(a -> "Missed".equalsIgnoreCase(a.getStatus()));
            }
        }
        default -> {
            appointments = new ArrayList<>(appointmentRepository.findAll());
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

        // The scheduled cleanup job owns status transitions. Reading this list
        // must not mark an appointment missed as a side effect.
        list.removeIf(a -> !"Missed".equalsIgnoreCase(a.getStatus()));

        if (hospitalId != null && !hospitalId.isBlank()) {
            list.removeIf(a -> !MongoIdUtil.matchesHospitalFilter(a.getHospitalId(), hospitalId));
        }

        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> bookAppointment(@RequestBody Appointment reqBody, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Doctor> doctor = findDoctorForAppointment(reqBody);
        if (doctor.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Doctor not found"));
        String scheduleError = validateWorkingHours(doctor.get(), reqBody.getHospitalId(), reqBody.getDate(), reqBody.getTime());
        if (scheduleError != null) return ResponseEntity.badRequest().body(Map.of("error", scheduleError));
        reqBody.setDoctorId(doctor.get().getId());
        if (hasDuplicateActiveAppointment(user.getId(), doctor.get(), reqBody.getDate(), reqBody.getHospitalId(), null)) {
            return duplicateAppointmentResponse();
        }

        // Calculate baseToken logic
        Query q = new Query(Criteria.where("date").is(reqBody.getDate())
                .andOperator(MongoIdUtil.idCriteria("doctorId", reqBody.getDoctorId())));
        List<Appointment> existing = mongoTemplate.find(q, Appointment.class);
        int maxToken = existing.stream().mapToInt(Appointment::getBaseToken).max().orElse(0);

        reqBody.setPatientId(user.getId());
        reqBody.setPatientName(user.getName());
        reqBody.setBaseToken(maxToken + 1);
        if (reqBody.getTriageLevel() == null) reqBody.setTriageLevel(1);
        // Booking confirms the slot immediately. Queue entry happens only at check-in.
        reqBody.setStatus("Confirmed");
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

    @PostMapping("/{id}/check-in")
    public ResponseEntity<?> checkIn(@PathVariable String id, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Appointment> aptOpt = appointmentRepository.findById(id);
        if (aptOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Appointment not found"));

        Appointment appointment = aptOpt.get();
        if ("patient".equals(user.getRole()) && !isPatientOwner(appointment, user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (!List.of("Confirmed", "Rescheduled").contains(appointment.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Appointment is not available for check-in"));
        }

        ZoneId zone = ZoneId.of("Asia/Kolkata");
        LocalDateTime now = LocalDateTime.now(zone);
        try {
            LocalDate date = LocalDate.parse(appointment.getDate());
            String rawTime = appointment.getTime().trim().toUpperCase();
            LocalTime time = rawTime.endsWith("AM") || rawTime.endsWith("PM")
                    ? LocalTime.parse(rawTime, DateTimeFormatter.ofPattern("h:mm a"))
                    : LocalTime.parse(rawTime, DateTimeFormatter.ofPattern("H:mm"));
            LocalDateTime slot = LocalDateTime.of(date, time);
            if (now.isBefore(slot.minusMinutes(10)) || now.isAfter(slot.plusMinutes(20))) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Check-in is available from 10 minutes before until 20 minutes after the appointment time"));
            }
        } catch (DateTimeParseException | NullPointerException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Appointment date or time is invalid"));
        }

        appointment.setStatus("Pending"); // Pending means checked in and waiting in the queue.
        appointment.setCheckedInAt(Instant.now());
        appointment.setUpdatedAt(Instant.now());
        appointment = appointmentRepository.save(appointment);
        kafkaProducerService.publishQueueEvent(appointment.getDoctorId(), Map.of(
                "action", "CHECKED_IN",
                "appointmentId", appointment.getId()
        ));
        return ResponseEntity.ok(appointment);
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

        String requestedDate = updateData.getDate() != null ? updateData.getDate() : appointment.getDate();
        String requestedTime = updateData.getTime() != null ? updateData.getTime() : appointment.getTime();
        Optional<Doctor> doctor = findDoctorForAppointment(appointment);
        if (doctor.isPresent()) {
            String scheduleError = validateWorkingHours(doctor.get(), appointment.getHospitalId(), requestedDate, requestedTime);
            if (scheduleError != null) return ResponseEntity.badRequest().body(Map.of("error", scheduleError));
            if (hasDuplicateActiveAppointment(appointment.getPatientId(), doctor.get(), requestedDate,
                    appointment.getHospitalId(), appointment.getId())) {
                return duplicateAppointmentResponse();
            }
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
            Optional<Doctor> doctor = findDoctorForAppointment(appointment);
            if (doctor.isPresent()) {
                String scheduleError = validateWorkingHours(doctor.get(), appointment.getHospitalId(), postponedDate, postponedTime);
                if (scheduleError != null) return ResponseEntity.badRequest().body(Map.of("error", scheduleError));
                if (hasDuplicateActiveAppointment(appointment.getPatientId(), doctor.get(), postponedDate,
                        appointment.getHospitalId(), appointment.getId())) {
                    return duplicateAppointmentResponse();
                }
            }
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

        Optional<Doctor> walkinDoctor = doctorRepository.findById(doctorId);
        if (reqBody.getPatientId() != null && walkinDoctor.isPresent()
                && hasDuplicateActiveAppointment(reqBody.getPatientId(), walkinDoctor.get(), reqBody.getDate(),
                        reqBody.getHospitalId(), null)) {
            return duplicateAppointmentResponse();
        }
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
