package com.lifefile.scos.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifefile.scos.model.AuditLog;
import com.lifefile.scos.model.Patient;
import com.lifefile.scos.model.PatientMemory;
import com.lifefile.scos.model.Prescription;
import com.lifefile.scos.model.MedicalRecord;
import com.lifefile.scos.repository.AuditLogRepository;
import com.lifefile.scos.repository.MedicalRecordRepository;
import com.lifefile.scos.repository.PatientMemoryRepository;
import com.lifefile.scos.repository.PatientRepository;
import com.lifefile.scos.repository.PrescriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * MemoryService — AI Memory Engine port from services/memoryService.js
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemoryService {

    private final PatientMemoryRepository memoryRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PatientRepository patientRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.genai.api-key:}")
    private String geminiApiKey;

    @Value("${app.genai.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String geminiBaseUrl;

    @Value("${app.genai.model:gemini-3.5-flash}")
    private String geminiModel;

    public String normalizeText(String text) {
        if (text == null) return "";
        return text.toLowerCase()
                .trim()
                .replaceAll("[.,/#!$%^&*;:{}=\\-_`~()]", "")
                .replaceAll("\\s+", " ");
    }

    private boolean isContradictory(String contentA, String contentB) {
        String normA = normalizeText(contentA);
        String normB = normalizeText(contentB);

        List<String> negativeKeywords = List.of("no known", "denies", "none", "no history", "negative for", "nil");
        boolean isANegative = negativeKeywords.stream().anyMatch(normA::contains);
        boolean isBNegative = negativeKeywords.stream().anyMatch(normB::contains);

        if (isANegative != isBNegative) {
            String stopWordsRegex = "(?i)\\b(no known|denies|none|no history|negative for|nil|allergy|allergies|history|patient|reports|a|an|the|of|to|has)\\b";
            String termA = normA.replaceAll(stopWordsRegex, "").trim();
            String termB = normB.replaceAll(stopWordsRegex, "").trim();

            if (termA.length() > 2 && termB.length() > 2 && (termA.contains(termB) || termB.contains(termA))) {
                return true;
            }
            if (isANegative && !normB.isEmpty() && normA.contains("allergy")) return true;
            if (isBNegative && !normA.isEmpty() && normB.contains("allergy")) return true;
        }
        return false;
    }

    public Map<String, Integer> deduplicateAndPersistCandidates(String patientId, List<Map<String, Object>> candidates, String actorId) {
        int created = 0, merged = 0, conflicted = 0;

        for (Map<String, Object> candidate : candidates) {
            String content = (String) candidate.get("content");
            String category = (String) candidate.get("category");
            if (content == null || category == null) continue;

            String normContent = normalizeText(content);
            if (normContent.isEmpty()) continue;

            List<PatientMemory> existingMemories = memoryRepository.findByPatientIdAndCategoryAndStatus(patientId, category, "ACTIVE");
            existingMemories.addAll(memoryRepository.findByPatientIdAndCategoryAndStatus(patientId, category, "SUPPORTED"));
            existingMemories.addAll(memoryRepository.findByPatientIdAndCategoryAndStatus(patientId, category, "VERIFIED"));

            boolean isMerged = false;
            boolean isConflicted = false;

            for (PatientMemory existing : existingMemories) {
                if (isContradictory(existing.getContent(), content)) {
                    existing.setStatus("CONFLICTED");
                    existing.setConfidence("CONFLICTED");
                    existing.setConflictNotes("Contradictory record detected: \"" + content + "\"");
                    memoryRepository.save(existing);

                    PatientMemory newConflict = PatientMemory.builder()
                            .patientId(patientId)
                            .category(category)
                            .type((String) candidate.getOrDefault("type", "FACT"))
                            .content(content)
                            .normalizedContent(normContent)
                            .sourceRecordIds(extractSourceRecordIds(candidate))
                            .confidence("CONFLICTED")
                            .status("CONFLICTED")
                            .conflictNotes("Contradicts prior record: \"" + existing.getContent() + "\"")
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();
                    memoryRepository.save(newConflict);

                    if (actorId != null) {
                        logAudit("MEMORY_CONFLICTED", actorId, "system", "Conflict detected between \"" + existing.getContent() + "\" and \"" + content + "\"");
                    }

                    conflicted++;
                    isConflicted = true;
                    break;
                }

                boolean isMatch = existing.getNormalizedContent().equals(normContent) ||
                        (existing.getNormalizedContent().length() > 5 && normContent.length() > 5 && existing.getNormalizedContent().equals(normContent));

                if (isMatch) {
                    Set<String> sourceIdsSet = new HashSet<>(existing.getSourceRecordIds() != null ? existing.getSourceRecordIds() : List.of());
                    sourceIdsSet.addAll(extractSourceRecordIds(candidate));
                    existing.setSourceRecordIds(new ArrayList<>(sourceIdsSet));

                    if (existing.getSourceRecordIds().size() > 1 && !"CONFLICTED".equals(existing.getStatus())) {
                        existing.setConfidence("SUPPORTED");
                    }
                    memoryRepository.save(existing);

                    if (actorId != null) {
                        logAudit("MEMORY_MERGED", actorId, "system", "Merged source for memory: " + existing.getContent());
                    }

                    merged++;
                    isMerged = true;
                    break;
                }
            }

            if (!isMerged && !isConflicted) {
                List<String> srcIds = extractSourceRecordIds(candidate);
                PatientMemory newMem = PatientMemory.builder()
                        .patientId(patientId)
                        .category(category)
                        .type((String) candidate.getOrDefault("type", "FACT"))
                        .content(content)
                        .normalizedContent(normContent)
                        .sourceRecordIds(srcIds)
                        .confidence(srcIds.size() > 1 ? "SUPPORTED" : "SUPPORTED") // Matches original JS logic
                        .status("ACTIVE")
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
                memoryRepository.save(newMem);

                if (actorId != null) {
                    logAudit("MEMORY_CREATED", actorId, "system", "Created new " + category + " memory: \"" + content + "\"");
                }

                created++;
            }
        }

        return Map.of("created", created, "merged", merged, "conflicted", conflicted);
    }

    public Map<String, Integer> extractDeterministicMemories(String patientId, String actorId) {
        List<String> searchIds = new ArrayList<>(List.of(patientId));
        Patient patientProfile = patientRepository.findById(patientId).orElseGet(() ->
                patientRepository.findByUserId(patientId).orElse(null)
        );

        if (patientProfile != null) {
            if (!patientProfile.getId().equals(patientId)) searchIds.add(patientProfile.getId());
            if (patientProfile.getUserId() != null && !patientProfile.getUserId().equals(patientId)) searchIds.add(patientProfile.getUserId());
        }

        List<Prescription> prescriptions = prescriptionRepository.findAll().stream()
                .filter(p -> searchIds.contains(p.getPatientId()))
                .collect(Collectors.toList());

        List<Map<String, Object>> candidates = new ArrayList<>();

        for (Prescription rx : prescriptions) {
            String rxId = rx.getId();

            if (rx.getDiagnosis() != null && rx.getDiagnosis().trim().length() > 2) {
                candidates.add(Map.of("category", "CONDITION", "type", "FACT", "content", rx.getDiagnosis().trim(), "sourceRecordIds", List.of(rxId)));
            }

            if (rx.getMedications() != null) {
                for (Prescription.Medication med : rx.getMedications()) {
                    if (med.getName() != null && med.getName().trim().length() > 1) {
                        String contentStr = med.getDosage() != null && !med.getDosage().isEmpty()
                                ? med.getName().trim() + " (" + med.getDosage().trim() + ")"
                                : med.getName().trim();
                        candidates.add(Map.of("category", "MEDICATION", "type", "FACT", "content", contentStr, "sourceRecordIds", List.of(rxId)));
                    }
                }
            }

            if (rx.getNotes() != null) {
                String text = rx.getNotes();
                Matcher allergyMatch1 = Pattern.compile("([a-zA-Z0-9\\s]+)\\s+allergy", Pattern.CASE_INSENSITIVE).matcher(text);
                Matcher allergyMatch2 = Pattern.compile("(?:allergic to|allergy:?|allergic:?)\\s+([a-zA-Z0-9\\s]+)(?:\\.|\\,|\\n|$)", Pattern.CASE_INSENSITIVE).matcher(text);

                String allergen = null;
                if (allergyMatch1.find()) allergen = allergyMatch1.group(1);
                else if (allergyMatch2.find()) allergen = allergyMatch2.group(1);

                if (allergen != null) {
                    allergen = allergen.replaceAll("(?i)(?:reports|severe|mild|moderate|known|suspected|confirmed|patient|has|history of|a|an|the)", "").trim();
                    if (allergen.length() > 1) {
                        candidates.add(Map.of("category", "ALLERGY", "type", "FACT", "content", allergen + " allergy", "sourceRecordIds", List.of(rxId)));
                    }
                }

                Matcher procMatch = Pattern.compile("(?:procedure:?|underwent|surgery:?)\\s+([a-zA-Z0-9\\s]+)(?:\\.|\\,|\\n|$)", Pattern.CASE_INSENSITIVE).matcher(text);
                if (procMatch.find()) {
                    candidates.add(Map.of("category", "PROCEDURE", "type", "FACT", "content", procMatch.group(1).trim(), "sourceRecordIds", List.of(rxId)));
                }
            }
        }

        return deduplicateAndPersistCandidates(patientId, candidates, actorId);
    }

    public Map<String, Integer> extractAIMemoryCandidates(String patientId, String prescriptionId, String actorId) {
        Prescription rx = prescriptionRepository.findById(prescriptionId).orElseThrow(() -> new RuntimeException("Prescription not found"));

        if (geminiApiKey == null || geminiApiKey.isEmpty()) {
            return extractDeterministicMemories(patientId, actorId);
        }

        try {
            String notesText = "Diagnosis: " + (rx.getDiagnosis() != null ? rx.getDiagnosis() : "") +
                    ". Notes: " + (rx.getNotes() != null ? rx.getNotes() : "") +
                    ". Medications: " + objectMapper.writeValueAsString(rx.getMedications());

            String prompt = "Extract concise medical memory facts from this text. \n" +
                    "Return ONLY valid JSON matching this schema:\n" +
                    "{\n" +
                    "  \"memories\": [\n" +
                    "    {\n" +
                    "      \"category\": \"ALLERGY\" | \"CONDITION\" | \"MEDICATION\" | \"PROCEDURE\" | \"INVESTIGATION\" | \"PREFERENCE\",\n" +
                    "      \"type\": \"FACT\" | \"PREFERENCE\" | \"INFERENCE\" | \"TEMPORARY_CONTEXT\",\n" +
                    "      \"content\": \"string concise medical memory\"\n" +
                    "    }\n" +
                    "  ]\n" +
                    "}\n" +
                    "Text: \"" + notesText + "\"";

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", geminiApiKey);

            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            String url = geminiBaseUrl + "/models/" + geminiModel + ":generateContent";

            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            String rawText = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();

            Matcher m = Pattern.compile("\\{[\\s\\S]*\\}").matcher(rawText);
            if (!m.find()) return extractDeterministicMemories(patientId, actorId);

            JsonNode parsed = objectMapper.readTree(m.group(0));
            JsonNode memoriesNode = parsed.path("memories");
            if (!memoriesNode.isArray()) return Map.of("created", 0, "merged", 0, "conflicted", 0);

            List<String> validCategories = List.of("ALLERGY", "CONDITION", "MEDICATION", "PROCEDURE", "INVESTIGATION", "PREFERENCE");
            List<String> validTypes = List.of("FACT", "PREFERENCE", "INFERENCE", "TEMPORARY_CONTEXT");
            List<Map<String, Object>> validatedCandidates = new ArrayList<>();

            for (JsonNode node : memoriesNode) {
                String cat = node.path("category").asText();
                String content = node.path("content").asText();
                String type = node.path("type").asText();

                if (content != null && !content.isEmpty() && validCategories.contains(cat)) {
                    validatedCandidates.add(Map.of(
                            "category", cat,
                            "type", validTypes.contains(type) ? type : "FACT",
                            "content", content.trim(),
                            "sourceRecordIds", List.of(rx.getId())
                    ));
                }
            }

            return deduplicateAndPersistCandidates(patientId, validatedCandidates, actorId);

        } catch (Exception e) {
            log.error("[Memory AI Extract Fallback] " + e.getMessage());
            return extractDeterministicMemories(patientId, actorId);
        }
    }

    private List<String> extractSourceRecordIds(Map<String, Object> candidate) {
        Object val = candidate.get("sourceRecordIds");
        if (val instanceof List<?>) {
            List<?> rawList = (List<?>) val;
            List<String> result = new ArrayList<>();
            for (Object item : rawList) {
                if (item != null) {
                    result.add(item.toString());
                }
            }
            return result;
        }
        return new ArrayList<>();
    }

    private void logAudit(String action, String actorId, String actorRole, String details) {
        auditLogRepository.save(AuditLog.builder()
                .action(action)
                .actor(actorId)
                .actorRole(actorRole)
                .target(details)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
    }

    public String generatePatientAISummary(String patientIdOrUserId) {
        Patient patient = patientRepository.findById(patientIdOrUserId)
                .orElseGet(() -> patientRepository.findByUserId(patientIdOrUserId).orElse(null));
        if (patient == null) {
            return null;
        }

        List<String> targetIds = new ArrayList<>();
        if (patient.getId() != null) targetIds.add(patient.getId());
        if (patient.getUserId() != null && !targetIds.contains(patient.getUserId())) targetIds.add(patient.getUserId());

        List<Prescription> prescriptions = prescriptionRepository.findAll().stream()
                .filter(p -> targetIds.contains(p.getPatientId()))
                .sorted((a, b) -> {
                    Instant tA = a.getCreatedAt() != null ? a.getCreatedAt() : Instant.EPOCH;
                    Instant tB = b.getCreatedAt() != null ? b.getCreatedAt() : Instant.EPOCH;
                    return tB.compareTo(tA);
                })
                .collect(Collectors.toList());

        List<MedicalRecord> records = medicalRecordRepository.findByPatientIdIn(targetIds);

        List<PatientMemory> memories = targetIds.stream()
                .flatMap(id -> memoryRepository.findByPatientId(id).stream())
                .collect(Collectors.toList());

        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an expert medical AI assistant. Summarize the following patient's medical history into a concise, professional clinical summary. Use Markdown formatting.\\n\\n");
        prompt.append("Patient Name: ").append(patient.getName() != null ? patient.getName() : "N/A").append("\\n");
        prompt.append("Age: ").append(patient.getAge() != null ? patient.getAge() : "N/A")
                .append(", Gender: ").append(patient.getGender() != null ? patient.getGender() : "N/A")
                .append(", Blood Group: ").append(patient.getBloodGroup() != null ? patient.getBloodGroup() : "N/A").append("\\n\\n");

        prompt.append("Known Medical Facts & Memories:\\n");
        if (memories.isEmpty()) prompt.append("None.\\n");
        for (PatientMemory m : memories) {
            prompt.append("- [").append(m.getCategory()).append("] ").append(m.getContent())
                    .append(" (Status: ").append(m.getStatus()).append(")\\n");
        }

        prompt.append("\\nPast Prescriptions & Diagnoses:\\n");
        if (prescriptions.isEmpty()) prompt.append("None.\\n");
        for (Prescription p : prescriptions) {
            String medsStr = "None";
            if (p.getMedications() != null && !p.getMedications().isEmpty()) {
                medsStr = p.getMedications().stream()
                        .map(m -> m.getName() + " (" + (m.getDosage() != null ? m.getDosage() : "N/A") + ")")
                        .collect(Collectors.joining(", "));
            }
            prompt.append("- Doctor: Dr. ").append(p.getDoctorName() != null ? p.getDoctorName() : "Doctor")
                    .append(", Diagnosis: ").append(p.getDiagnosis() != null ? p.getDiagnosis() : "N/A")
                    .append(", Medications: ").append(medsStr).append("\\n");
        }

        prompt.append("\\nUploaded Medical Records & Diagnostics:\\n");
        if (records.isEmpty()) prompt.append("None.\\n");
        for (MedicalRecord r : records) {
            prompt.append("- ").append(r.getTitle()).append(" (Type: ").append(r.getType()).append(")\\n");
        }

        String summaryText = "";
        if (geminiApiKey != null && !geminiApiKey.isEmpty()) {
            try {
                RestTemplate restTemplate = new RestTemplate();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("x-goog-api-key", geminiApiKey);

                Map<String, Object> body = Map.of(
                        "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt.toString()))))
                );

                HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
                String url = geminiBaseUrl + "/models/" + geminiModel + ":generateContent";

                ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
                JsonNode root = objectMapper.readTree(response.getBody());
                summaryText = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            } catch (Exception e) {
                log.warn("Gemini AI API Summary generation notice: " + e.getMessage() + ". Generating deterministic clinical summary.");
            }
        }

        if (summaryText == null || summaryText.isBlank()) {
            StringBuilder det = new StringBuilder();
            det.append("### 📋 Comprehensive Clinical AI Summary\\n\\n");
            det.append("**Patient Profile:** ").append(patient.getName() != null ? patient.getName() : "Patient").append(" (")
                    .append(patient.getAge() != null ? patient.getAge() + " yrs" : "Age N/A").append(", ")
                    .append(patient.getGender() != null ? patient.getGender() : "Gender N/A").append(", Blood Group: **")
                    .append(patient.getBloodGroup() != null ? patient.getBloodGroup() : "N/A").append("**)\\n\\n");

            if (!memories.isEmpty()) {
                det.append("#### 🧠 Extracted Clinical Memory Facts (").append(memories.size()).append(")\\n");
                for (PatientMemory m : memories) {
                    String badge = "CONFLICTED".equals(m.getStatus()) ? "⚠️ ALLERGY CONFLICT" : "✅ ACTIVE";
                    det.append("- **[").append(m.getCategory()).append("]** ").append(m.getContent())
                            .append(" *(").append(badge).append(")*\\n");
                }
                det.append("\\n");
            }

            det.append("#### 💊 Prescription & Diagnostic History (").append(prescriptions.size()).append(" Records)\\n");
            if (prescriptions.isEmpty()) {
                det.append("- No past prescription records found.\\n");
            } else {
                for (Prescription p : prescriptions) {
                    det.append("- (Dr. ").append(p.getDoctorName() != null ? p.getDoctorName() : "Doctor")
                            .append("): **").append(p.getDiagnosis() != null ? p.getDiagnosis() : "Routine Checkup").append("**\\n");
                    if (p.getMedications() != null && !p.getMedications().isEmpty()) {
                        String meds = p.getMedications().stream()
                                .map(m -> m.getName() + " (" + (m.getDosage() != null ? m.getDosage() : "N/A") + ")")
                                .collect(Collectors.joining(", "));
                        det.append("  - *Medications:* ").append(meds).append("\\n");
                    }
                }
            }

            det.append("\\n#### 📂 Uploaded Diagnostics & Medical Imaging (").append(records.size()).append(" Scans)\\n");
            if (records.isEmpty()) {
                det.append("- No external medical scans or lab records uploaded.\\n");
            } else {
                for (MedicalRecord r : records) {
                    det.append("- **").append(r.getTitle()).append("** *(").append(r.getType() != null ? r.getType().toUpperCase() : "RECORD").append(")*\\n");
                }
            }
            summaryText = det.toString();
        }

        return summaryText;
    }
}
