package com.lifefile.scos.controller;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lifefile.scos.model.Appointment;
import com.lifefile.scos.model.Clinic;
import com.lifefile.scos.model.Doctor;
import com.lifefile.scos.model.Hospital;
import com.lifefile.scos.model.Prescription;
import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.AppointmentRepository;
import com.lifefile.scos.repository.ClinicRepository;
import com.lifefile.scos.repository.DoctorRepository;
import com.lifefile.scos.repository.HospitalRepository;
import com.lifefile.scos.repository.PrescriptionRepository;
import com.lifefile.scos.repository.UserRepository;
import com.lifefile.scos.util.MongoIdUtil;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final HospitalRepository hospitalRepository;
    private final ClinicRepository clinicRepository;
    private final AppointmentRepository appointmentRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MongoTemplate mongoTemplate;

    @GetMapping("/admin")
    public ResponseEntity<?> getAdminAnalytics(HttpServletRequest request) {
        User user = currentUser(request);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (!"admin".equalsIgnoreCase(user.getRole())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        List<User> patients = userRepository.findAll().stream()
                .filter(item -> "patient".equalsIgnoreCase(item.getRole())).toList();
        List<Doctor> doctors = doctorRepository.findAll();
        List<Appointment> appointments = appointmentRepository.findAll();
        long completed = countStatus(appointments, "Completed");
        long walkins = appointments.stream().filter(item -> Boolean.TRUE.equals(item.getIsWalkin())).count();

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("totalPatients", patients.size());
        kpis.put("totalDoctors", doctors.size());
        kpis.put("totalHospitals", hospitalRepository.count());
        kpis.put("activeClinics", clinicRepository.findAll().stream().filter(item -> "active".equalsIgnoreCase(item.getStatus())).count());
        kpis.put("totalPrivateClinics", clinicRepository.count());
        kpis.put("totalAppointments", appointments.size());
        kpis.put("completedAppointments", completed);
        kpis.put("totalPrescriptions", prescriptionRepository.count());
        kpis.put("todayAppointments", appointments.stream().filter(item -> LocalDate.now().toString().equals(item.getDate())).count());
        kpis.put("completionRate", appointments.isEmpty() ? 0 : Math.round((double) completed / appointments.size() * 100));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("kpis", kpis);
        response.put("patientGrowth", groupUsersByDay(patients));
        response.put("appointmentsByStatus", groupAppointmentsByStatus(appointments));
        response.put("appointmentTrend", appointmentTrend(appointments));
        response.put("doctorsBySpec", groupDoctorsBySpecialization(doctors));
        response.put("hospitalLoad", groupHospitals(appointments));
        response.put("privateClinicLoad", groupPrivateClinics(appointments));
        response.put("peakHours", groupPeakHours(appointments));
        response.put("walkinVsBooked", Map.of("walkin", walkins, "booked", appointments.size() - walkins));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/doctor")
    public ResponseEntity<?> getDoctorAnalytics(HttpServletRequest request) {
        User user = currentUser(request);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        Doctor doctor = doctorRepository.findByUserId(user.getId())
                .orElseGet(() -> doctorRepository.findByNameContainingIgnoreCase(user.getName()).stream().findFirst().orElse(null));
        if (doctor == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Doctor profile not found"));

        List<String> ids = List.of(doctor.getId(), user.getId());
        List<Appointment> appointments = mongoTemplate.find(new Query(MongoIdUtil.idCriteria("doctorId", ids)), Appointment.class);
        List<Prescription> prescriptions = mongoTemplate.find(new Query(MongoIdUtil.idCriteria("doctorId", ids)), Prescription.class);
        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("totalAppointments", appointments.size());
        kpis.put("completedAppointments", countStatus(appointments, "Completed"));
        kpis.put("totalPrescriptions", prescriptions.size());
        kpis.put("uniquePatients", appointments.stream().map(Appointment::getPatientId).filter(Objects::nonNull).distinct().count());
        kpis.put("todayAppts", appointments.stream().filter(item -> LocalDate.now().toString().equals(item.getDate())).count());
        kpis.put("completionRate", percentage(countStatus(appointments, "Completed"), appointments.size()));
        kpis.put("rating", safeDouble(doctor.getRating()) > 0 ? safeDouble(doctor.getRating()) : 4.9);
        kpis.put("reviewCount", safeInt(doctor.getReviewCount()) > 0 ? safeInt(doctor.getReviewCount()) : 65);

        Clinic clinic = clinicRepository.findAll().stream()
            .filter(item -> idsMatch(item.getDoctorId(), doctor.getId()))
            .findFirst().orElse(null);
        List<Appointment> privateAppointments = appointments.stream().filter(this::isPrivateAppointment).toList();
        Map<String, Object> privateClinic = new LinkedHashMap<>();
        privateClinic.put("name", clinic == null || clinic.getName() == null ? "Private Clinic" : clinic.getName());
        privateClinic.put("totalAppointments", privateAppointments.size());
        privateClinic.put("completedAppointments", countStatus(privateAppointments, "Completed"));
        privateClinic.put("uniquePatients", privateAppointments.stream().map(Appointment::getPatientId).filter(Objects::nonNull).distinct().count());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("kpis", kpis);
        response.put("appointmentTrend", appointmentTrend(appointments));
        response.put("statusBreakdown", groupAppointmentsByStatus(appointments));
        response.put("topDiagnoses", groupDiagnoses(prescriptions));
        response.put("topMeds", groupMedications(prescriptions));
        response.put("hospitalDistribution", groupHospitals(appointments));
        response.put("privateClinic", privateClinic);
        response.put("weeklyPattern", weeklyPattern(appointments));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/hospital")
    public ResponseEntity<?> getHospitalAnalytics(HttpServletRequest request) {
        User user = currentUser(request);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (!"hospital".equalsIgnoreCase(user.getRole())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        Hospital hospital = hospitalRepository.findByUserId(user.getId())
                .orElseGet(() -> hospitalRepository.findByEmail(user.getEmail()).orElse(null));
        if (hospital == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Hospital not found"));

        List<Appointment> appointments = mongoTemplate.find(new Query(MongoIdUtil.idCriteria("hospitalId", hospital.getId())), Appointment.class);
        List<Prescription> prescriptions = mongoTemplate.find(new Query(MongoIdUtil.idCriteria("hospitalId", hospital.getId())), Prescription.class);
        List<Doctor> hospitalDoctors = hospital.getDoctors() == null ? List.of() : doctorRepository.findAllById(hospital.getDoctors());

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("totalDoctors", hospitalDoctors.size());
        kpis.put("totalAppointments", appointments.size());
        kpis.put("completedAppointments", countStatus(appointments, "Completed"));
        kpis.put("totalPrescriptions", prescriptions.size());
        kpis.put("uniquePatients", appointments.stream().map(Appointment::getPatientId).filter(Objects::nonNull).distinct().count());
        kpis.put("todayAppts", appointments.stream().filter(item -> LocalDate.now().toString().equals(item.getDate())).count());
        kpis.put("walkinCount", appointments.stream().filter(item -> Boolean.TRUE.equals(item.getIsWalkin())).count());
        kpis.put("completionRate", percentage(countStatus(appointments, "Completed"), appointments.size()));
        kpis.put("departments", hospital.getDepartments() == null ? 0 : hospital.getDepartments().size());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("kpis", kpis);
        response.put("appointmentTrend", appointmentTrendWithWalkins(appointments));
        response.put("doctorLoad", groupDoctorLoad(appointments));
        response.put("statusBreakdown", groupAppointmentsByStatus(appointments));
        response.put("departmentLoad", groupDoctorsBySpecialization(hospitalDoctors));
        response.put("peakHours", groupPeakHours(appointments));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/patient")
    public ResponseEntity<?> getPatientAnalytics(HttpServletRequest request) {
        User user = currentUser(request);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        List<Appointment> appointments = mongoTemplate.find(new Query(MongoIdUtil.idCriteria("patientId", user.getId())), Appointment.class);
        List<Prescription> prescriptions = mongoTemplate.find(new Query(MongoIdUtil.idCriteria("patientId", user.getId())), Prescription.class);
        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("totalAppointments", appointments.size());
        kpis.put("completedAppointments", countStatus(appointments, "Completed"));
        kpis.put("totalPrescriptions", prescriptions.size());
        kpis.put("uniqueDoctors", appointments.stream().map(Appointment::getDoctorId).filter(Objects::nonNull).distinct().count());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("kpis", kpis);
        response.put("appointmentHistory", appointmentHistory(appointments));
        response.put("statusBreakdown", groupAppointmentsByStatus(appointments));
        response.put("doctorsVisited", doctorsVisited(appointments));
        response.put("hospitalsVisited", groupHospitals(appointments));
        response.put("medications", groupMedications(prescriptions));
        return ResponseEntity.ok(response);
    }

    private User currentUser(HttpServletRequest request) {
        return (User) request.getAttribute("currentUser");
    }

    private long countStatus(List<Appointment> appointments, String status) {
        return appointments.stream().filter(item -> status.equalsIgnoreCase(item.getStatus())).count();
    }

    private long percentage(long numerator, long denominator) {
        return denominator == 0 ? 0 : Math.round((double) numerator / denominator * 100);
    }

    private List<Map<String, Object>> groupUsersByDay(List<User> users) {
        return users.stream().filter(item -> item.getCreatedAt() != null)
                .collect(Collectors.groupingBy(item -> item.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate().toString(), Collectors.counting()))
                .entrySet().stream().sorted(Map.Entry.comparingByKey())
                .map(entry -> entry(entry.getKey(), Map.of("count", entry.getValue()))).toList();
    }

    private List<Map<String, Object>> groupAppointmentsByStatus(List<Appointment> appointments) {
        return appointments.stream().collect(Collectors.groupingBy(item -> item.getStatus() == null ? "Pending" : item.getStatus(), Collectors.counting()))
                .entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(item -> entry(item.getKey(), Map.of("count", item.getValue()))).toList();
    }

    private List<Map<String, Object>> appointmentTrend(List<Appointment> appointments) {
        return appointments.stream().filter(item -> item.getDate() != null && !item.getDate().isBlank())
                .collect(Collectors.groupingBy(Appointment::getDate)).entrySet().stream().sorted(Map.Entry.comparingByKey())
                .map(item -> entry(item.getKey(), Map.of("total", item.getValue().size(), "completed", countStatus(item.getValue(), "Completed"), "cancelled", countStatus(item.getValue(), "Cancelled"), "missed", countStatus(item.getValue(), "Missed")))).toList();
    }

    private List<Map<String, Object>> appointmentTrendWithWalkins(List<Appointment> appointments) {
        return appointments.stream().filter(item -> item.getDate() != null && !item.getDate().isBlank())
                .collect(Collectors.groupingBy(Appointment::getDate)).entrySet().stream().sorted(Map.Entry.comparingByKey())
                .map(item -> entry(item.getKey(), Map.of("total", item.getValue().size(), "completed", countStatus(item.getValue(), "Completed"),
                        "walkin", item.getValue().stream().filter(appt -> Boolean.TRUE.equals(appt.getIsWalkin())).count()))).toList();
    }

    private List<Map<String, Object>> groupDoctorLoad(List<Appointment> appointments) {
        return appointments.stream().collect(Collectors.groupingBy(item -> item.getDoctorName() == null || item.getDoctorName().isBlank() ? "Unknown" : item.getDoctorName()))
                .entrySet().stream().sorted((left, right) -> Integer.compare(right.getValue().size(), left.getValue().size())).limit(10)
                .map(item -> entry(item.getKey(), Map.of("total", item.getValue().size(), "completed", countStatus(item.getValue(), "Completed")))).toList();
    }

    private List<Map<String, Object>> groupDoctorsBySpecialization(List<Doctor> doctors) {
        return doctors.stream().collect(Collectors.groupingBy(item -> item.getSpecialization() == null ? "General" : item.getSpecialization(), Collectors.counting()))
                .entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(10)
                .map(item -> entry(item.getKey(), Map.of("count", item.getValue()))).toList();
    }

    private List<Map<String, Object>> groupHospitals(List<Appointment> appointments) {
        return appointments.stream().collect(Collectors.groupingBy(item -> item.getHospitalName() == null || item.getHospitalName().isBlank() ? "Private / Unknown" : item.getHospitalName(), Collectors.counting()))
                .entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(8)
                .map(item -> entry(item.getKey(), Map.of("count", item.getValue()))).toList();
    }

    private List<Map<String, Object>> groupPrivateClinics(List<Appointment> appointments) {
        Map<String, String> clinicNamesByDoctor = clinicRepository.findAll().stream()
                .filter(item -> item.getDoctorId() != null)
                .collect(Collectors.toMap(Clinic::getDoctorId, item -> item.getName() == null ? "Private Clinic" : item.getName(), (left, right) -> left));
        return appointments.stream().filter(this::isPrivateAppointment)
                .collect(Collectors.groupingBy(item -> clinicNamesByDoctor.getOrDefault(item.getDoctorId(),
                        item.getDoctorName() == null || item.getDoctorName().isBlank() ? "Private Clinic" : item.getDoctorName() + " Private Clinic"), Collectors.counting()))
                .entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(10)
                .map(item -> entry(item.getKey(), Map.of("count", item.getValue()))).toList();
    }

    private boolean isPrivateAppointment(Appointment appointment) {
        return appointment.getHospitalId() == null || appointment.getHospitalId().isBlank();
    }

    private boolean idsMatch(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }

    private List<Map<String, Object>> groupPeakHours(List<Appointment> appointments) {
        return appointments.stream().filter(item -> item.getTime() != null && item.getTime().length() >= 2)
                .collect(Collectors.groupingBy(item -> item.getTime().substring(0, 2), Collectors.counting())).entrySet().stream()
                .sorted(Map.Entry.comparingByKey()).map(item -> entry(item.getKey(), Map.of("count", item.getValue()))).toList();
    }

    private List<Map<String, Object>> groupDiagnoses(List<Prescription> prescriptions) {
        return prescriptions.stream().filter(item -> item.getDiagnosis() != null && !item.getDiagnosis().isBlank())
                .collect(Collectors.groupingBy(Prescription::getDiagnosis, Collectors.counting())).entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(8)
                .map(item -> entry(item.getKey(), Map.of("count", item.getValue()))).toList();
    }

    private List<Map<String, Object>> groupMedications(List<Prescription> prescriptions) {
        Map<String, Long> counts = new HashMap<>();
        prescriptions.forEach(item -> {
            if (item.getMedications() != null) item.getMedications().forEach(medication -> {
                if (medication.getName() != null && !medication.getName().isBlank()) counts.merge(medication.getName(), 1L, Long::sum);
            });
        });
        return counts.entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(10)
                .map(item -> entry(item.getKey(), Map.of("count", item.getValue()))).toList();
    }

    private List<Map<String, Object>> appointmentHistory(List<Appointment> appointments) {
        return appointments.stream().filter(item -> item.getCreatedAt() != null)
                .collect(Collectors.groupingBy(item -> YearMonth.from(item.getCreatedAt().atZone(ZoneId.systemDefault())).toString()))
                .entrySet().stream().sorted(Map.Entry.comparingByKey()).limit(12)
                .map(item -> entry(item.getKey(), Map.of("total", item.getValue().size(), "completed", countStatus(item.getValue(), "Completed")))).toList();
    }

    private List<Map<String, Object>> doctorsVisited(List<Appointment> appointments) {
        return appointments.stream().filter(item -> "Completed".equalsIgnoreCase(item.getStatus()))
                .collect(Collectors.groupingBy(item -> item.getDoctorName() == null ? "Unknown" : item.getDoctorName()))
                .entrySet().stream().sorted((left, right) -> Integer.compare(right.getValue().size(), left.getValue().size())).limit(10)
                .map(item -> entry(item.getKey(), Map.of("count", item.getValue().size(), "spec", item.getValue().get(0).getSpec()))).toList();
    }

    private List<Map<String, Object>> weeklyPattern(List<Appointment> appointments) {
        Map<Integer, Long> counts = new TreeMap<>();
        for (int day = 1; day <= 7; day++) counts.put(day, 0L);
        appointments.forEach(item -> {
            if (item.getDate() != null) {
                try {
                    int day = LocalDate.parse(item.getDate()).getDayOfWeek().getValue() % 7 + 1;
                    counts.put(day, counts.get(day) + 1);
                } catch (RuntimeException ignored) { }
            }
        });
        return counts.entrySet().stream().map(item -> entry(item.getKey(), Map.of("count", item.getValue()))).toList();
    }

    private Map<String, Object> entry(Object id, Map<String, Object> values) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("_id", id);
        result.putAll(values);
        return result;
    }

    private double safeDouble(Double value) { return value == null ? 0.0 : value; }
    private int safeInt(Integer value) { return value == null ? 0 : value; }
}
