package com.lifefile.scos.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.lifefile.scos.security.JwtAuthFilter;

/**
 * Spring Security configuration — stateless JWT, no sessions.
 * Mirrors the auth middleware pattern: all /api/** protected except /api/auth/**
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/", "/index.html", "/error").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/demo/reset").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/demo/seed-all").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/demo/seed").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/doctors", "/api/doctors/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/hospitals", "/api/hospitals/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/reviews", "/api/reviews/**").permitAll()
                // WebSocket handshake
                .requestMatchers("/ws/**").permitAll()
                // Static file serving (uploads)
                .requestMatchers("/uploads/**").permitAll()
                // All other API routes require auth
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10); // matches bcryptjs salt rounds: 10
    }
}
