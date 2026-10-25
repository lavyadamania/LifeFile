package com.lifefile.scos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * LifeFile SCOS — Spring Boot Entry Point
 * Replaces: scos-backend/server.js
 */
@SpringBootApplication(exclude = {KafkaAutoConfiguration.class})
@EnableScheduling
public class ScosApplication {

    public static void main(String[] args) {
        SpringApplication.run(ScosApplication.class, args);
    }
}
