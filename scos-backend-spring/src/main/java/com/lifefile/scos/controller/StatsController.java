package com.lifefile.scos.controller;

import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.AppointmentRepository;
import com.lifefile.scos.repository.ClinicRepository;
import com.lifefile.scos.repository.DoctorRepository;
import com.lifefile.scos.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.Map;

/**
 * StatsController — replaces routes/stats.js
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final ClinicRepository clinicRepository;
    private final AppointmentRepository appointmentRepository;

    @GetMapping
    public ResponseEntity<?> getStats(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !"admin".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        long totalPatients = userRepository.findAll().stream().filter(u -> "patient".equals(u.getRole())).count();
        long activeDoctors = doctorRepository.findAll().stream().filter(d -> "Active".equals(d.getStatus())).count();
        
        String today = LocalDate.now().toString();
        long todayAppointments = appointmentRepository.findAll().stream()
                .filter(a -> today.equals(a.getDate()) && (a.getStatus().equals("Confirmed") || a.getStatus().equals("Pending")))
                .count();

        long activeClinics = clinicRepository.findAll().stream().filter(c -> "active".equals(c.getStatus())).count();

        return ResponseEntity.ok(Map.of(
                "totalPatients", totalPatients,
                "activeDoctors", activeDoctors,
                "todayAppointments", todayAppointments,
                "activeClinics", activeClinics
        ));
    }
}
