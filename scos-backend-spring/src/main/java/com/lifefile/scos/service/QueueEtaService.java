package com.lifefile.scos.service;

import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * QueueEtaService — replaces services/queueETA.js
 */
@Service
public class QueueEtaService {

    public static final int DEFAULT_CONSULT_DURATION = 10;

    @Data
    public static class EtaDetails {
        private int queuePosition;
        private Map<String, Integer> estimatedWait;
        private Integer topTokenInQueue;
    }

    public EtaDetails getPatientETA(List<Map<String, Object>> sortedQueue, String targetAppointmentId, int avgConsultDuration) {
        if (sortedQueue == null || sortedQueue.isEmpty()) return null;

        int positionIndex = -1;
        for (int i = 0; i < sortedQueue.size(); i++) {
            if (targetAppointmentId.equals(sortedQueue.get(i).get("id").toString())) {
                positionIndex = i;
                break;
            }
        }

        if (positionIndex == -1) return null;

        int queuePosition = positionIndex + 1;
        int baseWaitMin = positionIndex * avgConsultDuration;
        int halfDur = avgConsultDuration / 2;

        int estimatedWaitMin = Math.max(0, baseWaitMin - halfDur);
        int estimatedWaitMax = baseWaitMin + halfDur;

        if (positionIndex == 0) {
            estimatedWaitMin = 0;
            estimatedWaitMax = 5;
        }

        Integer topToken = (Integer) sortedQueue.get(0).get("baseToken");

        EtaDetails details = new EtaDetails();
        details.setQueuePosition(queuePosition);
        details.setEstimatedWait(Map.of("min", estimatedWaitMin, "max", estimatedWaitMax));
        details.setTopTokenInQueue(topToken);
        return details;
    }
}
