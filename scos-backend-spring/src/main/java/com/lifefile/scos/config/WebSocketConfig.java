package com.lifefile.scos.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

/**
 * WebSocket (STOMP) Configuration — replaces Socket.io in server.js
 *
 * Frontend migration:
 *   socket.io-client  →  @stomp/stompjs + sockjs-client
 *   socket.on('queue-update', fn)  →  stompClient.subscribe('/topic/queue/{doctorId}', fn)
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(@org.springframework.lang.NonNull MessageBrokerRegistry registry) {
        // Outbound topics the server pushes to (client subscribes)
        registry.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages FROM client TO server (@MessageMapping)
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(@org.springframework.lang.NonNull StompEndpointRegistry registry) {
        // SockJS fallback endpoint — frontend connects to ws://host:8080/ws
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
