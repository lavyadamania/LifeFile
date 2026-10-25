package com.lifefile.scos.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * Kafka topic declarations — replaces kafkajs topic setup in services/kafka.js
 */
@Configuration
public class KafkaConfig {

    @Value("${app.kafka.topic.queue-events}")
    private String queueEventsTopic;

    @Value("${app.kafka.topic.appointment-events}")
    private String appointmentEventsTopic;

    @Bean
    public NewTopic queueEventsTopic() {
        return TopicBuilder.name(queueEventsTopic)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic appointmentEventsTopic() {
        return TopicBuilder.name(appointmentEventsTopic)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
