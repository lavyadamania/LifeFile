package com.lifefile.scos.service;

import com.lifefile.scos.model.Appointment;
import com.lifefile.scos.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * AppointmentCleanupService
 *
 * Runs hourly and marks any "Pending" or "Confirmed" appointment whose
 * date + time is more than 48 hours in the past as "Missed".
 *
 * Doctor side : Missed appointments are excluded from the queue view,
 *               so the doctor's dashboard auto-clears itself.
 * Patient side: The appointment remains visible with status "Missed"
 *               so the patient can see it and delete it manually.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentCleanupService {

    private static final long MISSED_THRESHOLD_HOURS = 48;

    private final AppointmentRepository appointmentRepository;

    /**
     * Runs every hour on the hour.
     * cron = "0 0 * * * *" means: second=0, minute=0, every hour, every day.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void markStalePendingAppointmentsAsMissed() {
        log.info("[Cleanup] Running 48-hour stale appointment check...");

        Instant cutoff = Instant.now().minusSeconds(MISSED_THRESHOLD_HOURS * 3600);
        ZoneId zone    = ZoneId.systemDefault();

        // Fetch all appointments that could still be "active"
        List<Appointment> candidates = appointmentRepository.findByStatusIn(
                List.of("Pending", "Confirmed")
        );

        int marked = 0;
        for (Appointment appt : candidates) {
            try {
                Instant apptInstant = parseAppointmentInstant(appt, zone);
                if (apptInstant != null && apptInstant.isBefore(cutoff)) {
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

    /**
     * Parse the appointment's date ("YYYY-MM-DD") and time ("HH:mm" or "HH:MM AM/PM")
     * into an Instant for comparison.
     */
    private Instant parseAppointmentInstant(Appointment appt, ZoneId zone) {
        if (appt.getDate() == null || appt.getDate().isBlank()) return null;

        try {
            LocalDate date = LocalDate.parse(appt.getDate());
            LocalTime time = LocalTime.MIDNIGHT; // default to midnight if no time

            if (appt.getTime() != null && !appt.getTime().isBlank()) {
                String t = appt.getTime().trim();
                try {
                    // Try 24-hour: "HH:mm"
                    time = LocalTime.parse(t, DateTimeFormatter.ofPattern("HH:mm"));
                } catch (DateTimeParseException e1) {
                    try {
                        // Try 12-hour: "hh:mm a" e.g. "09:30 AM"
                        time = LocalTime.parse(t.toUpperCase(),
                                DateTimeFormatter.ofPattern("hh:mm a"));
                    } catch (DateTimeParseException e2) {
                        // Fallback — use midnight; still catches old dates
                        log.debug("[Cleanup] Unrecognised time format '{}' for appt {}, using midnight.", t, appt.getId());
                    }
                }
            }

            return LocalDateTime.of(date, time).atZone(zone).toInstant();
        } catch (Exception e) {
            log.warn("[Cleanup] Failed to parse date '{}' for appt {}", appt.getDate(), appt.getId());
            return null;
        }
    }
}
