package com.lifefile.scos.service;

import com.lifefile.scos.model.Appointment;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;

/**
 * DynamicPriorityService — implements the Adaptive Clinical Priority Algorithm (ACPA).
 * Replaces services/dynamicPriority.js
 */
@Service
public class DynamicPriorityService {

    public static final double WEIGHT_BASE     = 10.0;
    public static final double WEIGHT_AGE      = 0.5;
    public static final double WEIGHT_FAIRNESS = 1.2;
    public static final double WEIGHT_TRIAGE   = 20.0;
    public static final double WEIGHT_PENALTY  = 30.0;

    @Data
    public static class PriorityDetails {
        private double score;
        private double slotContribution;
        private double agingContribution;
        private double fairnessContribution;
        private double triageContribution;
        private double penaltyContribution;
        private String priorityLevel;
        private String reason;
        private long waitMinutes;
        private int token;
    }

    public PriorityDetails calculateCEP(Appointment appointment, LocalDateTime currentTime) {
        // 1. Slot Contribution
        int token = appointment.getBaseToken() != null && appointment.getBaseToken() > 0 ? appointment.getBaseToken() : 1;
        double slotContribution = Math.max(0, 100 - token) * WEIGHT_BASE;

        // 2. Aging / Wait Time Contribution
        LocalDateTime scheduledTime = parseAppointmentDateTime(appointment.getDate(), appointment.getTime());
        long diffMs = ChronoUnit.MILLIS.between(scheduledTime, currentTime);
        long waitMinutes = diffMs / 1000 / 60;
        if (waitMinutes < 0) waitMinutes = 0;
        double agingContribution = waitMinutes * WEIGHT_AGE;

        // 3. Fairness Contribution
        double fairnessContribution = Math.pow(waitMinutes, WEIGHT_FAIRNESS) * 0.1;

        // 4. Triage Contribution
        int severity = appointment.getTriageLevel() != null ? appointment.getTriageLevel() : 1;
        double triageContribution = severity * WEIGHT_TRIAGE;
        if (severity == 5) triageContribution += 1000;
        else if (severity == 4) triageContribution += 500;

        // 5. Penalty Contribution
        int missed = appointment.getMissedCalls() != null ? appointment.getMissedCalls() : 0;
        double penaltyContribution = Math.min(150, missed * WEIGHT_PENALTY);

        // Final CEP
        double rawScore = slotContribution + agingContribution + fairnessContribution + triageContribution - penaltyContribution;
        double score = Math.round(rawScore * 10.0) / 10.0;

        String priorityLevel = "NORMAL";
        if (score >= 1000) priorityLevel = "EMERGENCY";
        else if (score >= 800) priorityLevel = "HIGH";
        else if (score < 500) priorityLevel = "LOW";

        if (missed > 0 && priorityLevel.equals("NORMAL")) priorityLevel = "DELAYED";

        String reason = "Standard queue position";
        if (fairnessContribution > 50) reason = "Fairness priority (anti-starvation override)";
        else if (triageContribution > 50 && agingContribution > 30) reason = "High triage + prolonged waiting";
        else if (triageContribution > 50) reason = "High clinical triage";
        else if (agingContribution > 50) reason = "Aging priority (long wait)";
        else if (penaltyContribution > 0) reason = "Missed-call penalty applied";

        PriorityDetails details = new PriorityDetails();
        details.setScore(score);
        details.setSlotContribution(slotContribution);
        details.setAgingContribution(agingContribution);
        details.setFairnessContribution(Math.round(fairnessContribution * 10.0) / 10.0);
        details.setTriageContribution(triageContribution);
        details.setPenaltyContribution(penaltyContribution);
        details.setPriorityLevel(priorityLevel);
        details.setReason(reason);
        details.setWaitMinutes(waitMinutes);
        details.setToken(token);
        return details;
    }

    private LocalDateTime parseAppointmentDateTime(String dateStr, String timeStr) {
        if (dateStr == null || timeStr == null) return LocalDateTime.now();
        try {
            LocalDate date = LocalDate.parse(dateStr);
            LocalTime time;
            if (timeStr.contains("AM") || timeStr.contains("PM")) {
                time = LocalTime.parse(timeStr.toUpperCase(), DateTimeFormatter.ofPattern("h:mm a"));
            } else {
                time = LocalTime.parse(timeStr);
            }
            return LocalDateTime.of(date, time);
        } catch (DateTimeParseException e) {
            return LocalDateTime.now();
        }
    }
}
