package com.lifefile.scos.service;

import com.lifefile.scos.model.Appointment;
import com.lifefile.scos.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Marks pending or confirmed appointments from previous dates as missed.
 * Same-day appointments stay in the queue so doctors can call or mark them
 * missed explicitly.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentCleanupService {

    private final AppointmentRepository appointmentRepository;

    @Scheduled(cron = "0 * * * * *")
    public void markStalePendingAppointmentsAsMissed() {
        log.info("[Cleanup] Running expired appointment check...");

        ZoneId zone = ZoneId.systemDefault();
        LocalDate today = LocalDate.now(zone);
        List<Appointment> candidates = appointmentRepository.findByStatusIn(
                List.of("Pending", "Confirmed")
        );

        int marked = 0;
        for (Appointment appt : candidates) {
            try {
                if (appt.getDate() == null || appt.getDate().isBlank()) continue;
                LocalDate appointmentDate = LocalDate.parse(appt.getDate());
                if (appointmentDate.isBefore(today)) {
                    appt.setStatus("Missed");
                    appt.setUpdatedAt(Instant.now());
                    appointmentRepository.save(appt);
                    marked++;
                    log.debug("[Cleanup] Marked appointment {} (patient={}, date={} {}) as Missed",
                            appt.getId(), appt.getPatientName(), appt.getDate(), appt.getTime());
                }
            } catch (Exception e) {
                log.warn("[Cleanup] Could not process appointment {}: {}", appt.getId(), e.getMessage());
            }
        }

        if (marked > 0) {
            log.info("[Cleanup] Marked {} stale appointments as Missed.", marked);
        } else {
            log.info("[Cleanup] No stale appointments found.");
        }
    }
}
