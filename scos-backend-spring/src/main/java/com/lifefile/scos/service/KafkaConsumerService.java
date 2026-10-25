package com.lifefile.scos.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

/**
 * KafkaConsumerService — replaces services/kafka.js consumer side.
 * Listens to Kafka topics and forwards events to WebSocket clients.
 */
@Service
@RequiredArgsConstructor
public class KafkaConsumerService {

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerService.class);

    private final SimpMessagingTemplate websocket;
    private final ObjectMapper          objectMapper;

    // @KafkaListener(topics = "${app.kafka.topic.queue-events}", groupId = "${spring.kafka.consumer.group-id}")
    public void onQueueEvent(String message) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> event = objectMapper.readValue(message, Map.class);
            String doctorId = (String) event.get("doctorId");
            Object payload  = event.get("payload");
            if (doctorId != null) {
                websocket.convertAndSend("/topic/queue/" + doctorId, payload);
                log.debug("Forwarded queue event to /topic/queue/{}", doctorId);
            }
        } catch (Exception e) {
            log.error("Error processing queue event: {}", e.getMessage());
        }
    }

    // @KafkaListener(topics = "${app.kafka.topic.appointment-events}", groupId = "${spring.kafka.consumer.group-id}")
    public void onAppointmentEvent(String message) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> event = objectMapper.readValue(message, Map.class);
            String appointmentId = (String) event.get("appointmentId");
            Object payload       = event.get("payload");
            if (appointmentId != null) {
                websocket.convertAndSend("/topic/appointments/" + appointmentId, payload);
            }
        } catch (Exception e) {
            log.error("Error processing appointment event: {}", e.getMessage());
        }
    }
}
