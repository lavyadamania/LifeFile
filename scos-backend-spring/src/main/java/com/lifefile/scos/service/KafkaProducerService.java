package com.lifefile.scos.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

/**
 * KafkaProducerService — replaces services/kafka.js producer side.
 * Also broadcasts events to WebSocket topics (replaces socket.io emit).
 */
@Service
public class KafkaProducerService {

    private static final Logger log = LoggerFactory.getLogger(KafkaProducerService.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final SimpMessagingTemplate          websocket;
    private final ObjectMapper                   objectMapper;

    @Autowired
    public KafkaProducerService(
            @Autowired(required = false) KafkaTemplate<String, String> kafkaTemplate,
            SimpMessagingTemplate websocket,
            ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.websocket = websocket;
        this.objectMapper = objectMapper;
    }

    @Value("${app.kafka.topic.queue-events}")
    private String queueEventsTopic;

    @Value("${app.kafka.topic.appointment-events}")
    private String appointmentEventsTopic;

    /**
     * Publish a queue update event.
     * Replaces: producer.send({ topic: 'queue-events', ... }) + io.emit('queue-update', ...)
     */
    public void publishQueueEvent(String doctorId, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(Map.of(
                    "type",     "queue-update",
                    "doctorId", doctorId,
                    "payload",  payload
            ));
            if (kafkaTemplate != null) {
                kafkaTemplate.send(queueEventsTopic, doctorId, json);
            } else {
                log.warn("Kafka disabled: Queue event for doctor {} not sent to topic.", doctorId);
            }
            // Immediately also push to WebSocket topic
            websocket.convertAndSend("/topic/queue/" + doctorId, payload);
            log.debug("Published queue event for doctor {}", doctorId);
        } catch (Exception e) {
            log.error("Failed to publish queue event: {}", e.getMessage());
        }
    }

    /**
     * Publish an appointment status change event.
     */
    public void publishAppointmentEvent(String appointmentId, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(Map.of(
                    "type",          "appointment-update",
                    "appointmentId", appointmentId,
                    "payload",       payload
            ));
            if (kafkaTemplate != null) {
                kafkaTemplate.send(appointmentEventsTopic, appointmentId, json);
            } else {
                log.warn("Kafka disabled: Appointment event not sent.");
            }
        } catch (Exception e) {
            log.error("Failed to publish appointment event: {}", e.getMessage());
        }
    }

    public void publishPrescriptionEvent(String prescriptionId, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(Map.of(
                    "type",           "prescription-created",
                    "prescriptionId", prescriptionId,
                    "payload",        payload
            ));
            // You can broadcast this to a prescriptions topic if defined, or just log
            if (kafkaTemplate != null) {
                kafkaTemplate.send("scos.prescriptions", prescriptionId, json);
            } else {
                log.warn("Kafka disabled: Prescription event not sent.");
            }
        } catch (Exception e) {
            log.error("Failed to publish prescription event: {}", e.getMessage());
        }
    }
}
