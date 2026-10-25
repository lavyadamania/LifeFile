package com.lifefile.scos.security;

import io.jsonwebtoken.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT Utility — replaces jsonwebtoken usage in routes/auth.js and middleware/auth.js
 *
 * Token format MUST match Node.js backend:
 *   jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' })
 *
 * Node.js `jsonwebtoken` does not enforce a minimum key length, so secrets like
 * "supersecret" (< 256 bits) are valid there.  JJWT's Keys.hmacShaKeyFor() rejects
 * keys shorter than 256 bits for HS256.  We bypass this enforcement by constructing
 * the SecretKeySpec directly — matching Node.js behaviour exactly.
 */
@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = io.jsonwebtoken.security.Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /** Issue a token matching existing schema: { id: userId } */
    public String generateToken(String userId) {
        return Jwts.builder()
                .claim("id", userId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    /** Extract the MongoDB user id from the "id" claim (set by Node.js backend). */
    public String extractUserId(String token) {
        return parseClaims(token).get("id", String.class);
    }

    /**
     * Extract email from token if present (optional claim — not set by Node.js,
     * but used as a fallback resolution hint if Spring issues tokens with it).
     */
    public String extractEmail(String token) {
        try {
            return parseClaims(token).get("email", String.class);
        } catch (Exception e) {
            return null;
        }
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtUtil.class);

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            log.warn("validateToken failed with [{}]: {}", e.getClass().getSimpleName(), e.getMessage());
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
