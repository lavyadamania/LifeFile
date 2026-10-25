package com.lifefile.scos.controller;

import com.lifefile.scos.model.PatientMemory;
import com.lifefile.scos.model.Prescription;
import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.PatientMemoryRepository;
import com.lifefile.scos.repository.PatientRepository;
import com.lifefile.scos.service.MemoryService;
import com.lifefile.scos.util.MongoIdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * MemoryController — replaces routes/memory.js
 */
@RestController
@RequestMapping("/api/memory")
@RequiredArgsConstructor
public class MemoryController {

    private final PatientMemoryRepository memoryRepository;
    private final PatientRepository patientRepository;
    private final MongoTemplate mongoTemplate;
    private final MemoryService memoryService;

    // Simplified auth check for demo purposes
    private boolean isAuthorized(User user, String patientId) {
        if (user == null) return false;
        if ("admin".equals(user.getRole()) || "hospital".equals(user.getRole()) || "doctor".equals(user.getRole())) return true;
        if ("me".equalsIgnoreCase(patientId)) return true;
        if (user.getId().equals(patientId)) return true;
        return patientRepository.findByUserId(user.getId())
                .map(p -> p.getId().equals(patientId))
                .orElse(false);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getPatientMemories(@PathVariable String patientId, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !isAuthorized(user, patientId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied"));
        }
        String resolvedPatientId = "me".equalsIgnoreCase(patientId) ? user.getId() : patientId;

        List<String> targetIds = new ArrayList<>();
        targetIds.add(resolvedPatientId);
        patientRepository.findById(resolvedPatientId).ifPresent(p -> {
            if (p.getUserId() != null) targetIds.add(p.getUserId());
        });
        patientRepository.findByUserId(resolvedPatientId).ifPresent(p -> {
            if (p.getId() != null) targetIds.add(p.getId());
        });

        Query query = new Query(MongoIdUtil.idCriteria("patientId", targetIds));
        List<PatientMemory> memories = new ArrayList<>(mongoTemplate.find(query, PatientMemory.class));

        if (memories.isEmpty()) {
            memoryService.extractDeterministicMemories(resolvedPatientId, user.getId());
            memories.addAll(mongoTemplate.find(query, PatientMemory.class));
        }

        Map<String, List<PatientMemory>> grouped = new HashMap<>();
        grouped.put("ALLERGY", new ArrayList<>());
        grouped.put("CONDITION", new ArrayList<>());
        grouped.put("MEDICATION", new ArrayList<>());
        grouped.put("PROCEDURE", new ArrayList<>());
        grouped.put("INVESTIGATION", new ArrayList<>());
        grouped.put("PREFERENCE", new ArrayList<>());
        grouped.put("UNCATEGORIZED", new ArrayList<>());

        for (PatientMemory m : memories) {
            String cat = (m.getCategory() == null || m.getCategory().isBlank()) 
                    ? "UNCATEGORIZED" 
                    : m.getCategory().toUpperCase().trim();
            grouped.computeIfAbsent(cat, k -> new ArrayList<>()).add(m);
        }

        return ResponseEntity.ok(Map.of(
                "patientId", resolvedPatientId,
                "totalCount", memories.size(),
                "memories", memories,
                "grouped", grouped
        ));
    }

    @GetMapping("/{memoryId}/sources")
    public ResponseEntity<?> getMemorySources(@PathVariable String memoryId, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        PatientMemory memory = memoryRepository.findById(memoryId).orElse(null);

        if (memory == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        if (user == null || !isAuthorized(user, memory.getPatientId())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        List<Prescription> sources = new ArrayList<>();
        if (memory.getSourceRecordIds() != null && !memory.getSourceRecordIds().isEmpty()) {
            Query q = new Query(MongoIdUtil.idCriteria("_id", memory.getSourceRecordIds()));
            sources.addAll(mongoTemplate.find(q, Prescription.class));
        }

        return ResponseEntity.ok(Map.of(
                "memoryId", memory.getId(),
                "content", memory.getContent(),
                "category", memory.getCategory(),
                "sources", sources
        ));
    }

    @PostMapping("/extract/{patientId}")
    public ResponseEntity<?> extractMemories(@PathVariable String patientId, @RequestBody(required = false) Map<String, String> body, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || !isAuthorized(user, patientId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        String rxId = body != null ? body.get("prescriptionId") : null;
        Map<String, Integer> result;

        if (rxId != null) {
            result = memoryService.extractAIMemoryCandidates(patientId, rxId, user.getId());
        } else {
            result = memoryService.extractDeterministicMemories(patientId, user.getId());
        }

        return ResponseEntity.ok(Map.of("message", "Memory extraction complete", "result", result));
    }

    @PatchMapping("/{memoryId}/review")
    public ResponseEntity<?> reviewMemory(@PathVariable String memoryId, @RequestBody Map<String, String> body, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null || (!"admin".equals(user.getRole()) && !"doctor".equals(user.getRole()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        PatientMemory memory = memoryRepository.findById(memoryId).orElse(null);
        if (memory == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        if (body.containsKey("status")) memory.setStatus(body.get("status"));
        if (body.containsKey("confidence")) memory.setConfidence(body.get("confidence"));
        if (body.containsKey("conflictNotes")) memory.setConflictNotes(body.get("conflictNotes"));

        memoryRepository.save(memory);
        return ResponseEntity.ok(Map.of("message", "Memory status updated successfully", "memory", memory));
    }
}
