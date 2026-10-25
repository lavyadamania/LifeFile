package com.lifefile.scos.security;

import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * JWT Auth Filter — replaces middleware/auth.js
 * Reads Bearer token from Authorization header, validates it, and sets the security context.
 *
 * Robustness: falls back to email-based lookup when userId findById misses (ObjectId vs String).
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            if (jwtUtil.validateToken(token)) {
                String userId = jwtUtil.extractUserId(token);

                // Primary: find by Mongo _id (works for both String and ObjectId _id)
                Optional<User> userOpt = userRepository.findByIdFlexible(userId);

                // Fallback: try by email claim (for tokens issued before schema migration)
                if (userOpt.isEmpty()) {
                    String email = jwtUtil.extractEmail(token);
                    if (email != null && !email.isBlank()) {
                        userOpt = userRepository.findByEmail(email.toLowerCase());
                        if (userOpt.isPresent()) {
                            log.debug("JwtAuthFilter: resolved user by email fallback for userId={}", userId);
                        }
                    }
                }

                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    // Attach user to request attribute for controllers to access
                    request.setAttribute("currentUser", user);

                    var auth = new UsernamePasswordAuthenticationToken(
                            user,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().toUpperCase()))
                    );
                    SecurityContextHolder.getContext().setAuthentication(auth);
                } else {
                    log.warn("JwtAuthFilter: token valid but no user found for userId={}, path={}",
                            userId, request.getRequestURI());
                    SecurityContextHolder.clearContext();
                }
            } else {
                log.warn("JwtAuthFilter: invalid/expired token for path={}", request.getRequestURI());
                SecurityContextHolder.clearContext();
            }
        } else {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
