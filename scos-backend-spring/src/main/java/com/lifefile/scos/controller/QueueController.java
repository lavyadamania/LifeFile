package com.lifefile.scos.controller;

import com.lifefile.scos.model.Appointment;
import com.lifefile.scos.repository.AppointmentRepository;
import com.lifefile.scos.service.DynamicPriorityService;
import com.lifefile.scos.service.KafkaProducerService;
import com.lifefile.scos.service.QueueEtaService;
import com.lifefile.scos.util.MongoIdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * QueueController — replaces routes/queue.js
 */
@RestController
@RequestMapping("/api/queue")
@RequiredArgsConstructor
public class QueueController {

    private final AppointmentRepository appointmentRepository;
    private final MongoTemplate mongoTemplate;
    private final DynamicPriorityService priorityService;
    private final QueueEtaService etaService;
    private final KafkaProducerService kafkaProducerService;

    @GetMapping("/list")
    public ResponseEntity<?> getQueueList(
            @RequestParam String doctorId,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String hospitalId) {

        if (doctorId == null || doctorId.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "doctorId is required"));
        }

        String utcToday = LocalDate.now().toString();
        String dateToMatch = date != null ? date : utcToday;
        // Confirmed appointments are booked but have not checked in yet.
        List<String> validStatuses = List.of("Pending", "In_Progress");

        Query query = new Query(new Criteria().andOperator(
                MongoIdUtil.idCriteria("doctorId", doctorId),
                Criteria.where("date").is(dateToMatch),
                Criteria.where("status").in(validStatuses)
        ));

        List<Appointment> appointments = new ArrayList<>(mongoTemplate.find(query, Appointment.class));

        if (hospitalId != null && !hospitalId.isBlank()) {
            appointments.removeIf(a -> !MongoIdUtil.matchesHospitalFilter(a.getHospitalId(), hospitalId));
        }

        LocalDateTime currentTime = LocalDateTime.now();
        List<Map<String, Object>> pendingAppointments = new ArrayList<>();
        Map<String, Object> nowServing = null;

        for (Appointment appt : appointments) {
            DynamicPriorityService.PriorityDetails priority = priorityService.calculateCEP(appt, currentTime);

            // Appointments already store the patient's display name. Avoid a
            // single-result profile lookup here: legacy/demo data can contain
            // duplicate Patient profiles for one user, which otherwise makes
            // the entire queue endpoint fail with IncorrectResultSizeDataAccessException.
            String patientName = appt.getPatientName();
            if (patientName == null || patientName.isBlank()) {
                patientName = "Patient";
            }

            Map<String, Object> apptObj = new HashMap<>();
            apptObj.put("_id", appt.getId());
            apptObj.put("id", appt.getId());
            apptObj.put("patientId", appt.getPatientId());
            apptObj.put("patientName", patientName);
            apptObj.put("baseToken", appt.getBaseToken());
            apptObj.put("tokenNumber", appt.getBaseToken());
            apptObj.put("triageLevel", appt.getTriageLevel());
            apptObj.put("missedCalls", appt.getMissedCalls());
            apptObj.put("status", appt.getStatus());
            apptObj.put("time", appt.getTime());
            apptObj.put("hospitalId", appt.getHospitalId());
            apptObj.put("hospitalName", appt.getHospitalName());
            String complaint = appt.getChiefComplaint();
            if (complaint == null || complaint.isBlank()) {
                complaint = "General OPD Consultation";
            }
            apptObj.put("chiefComplaint", complaint);
            apptObj.put("reason", complaint);
            apptObj.put("priority", priority);

            if ("In_Progress".equals(appt.getStatus())) {
                nowServing = apptObj;
            } else {
                pendingAppointments.add(apptObj);
            }
        }

        // Sort descending by priority score
        pendingAppointments.sort((a, b) -> {
            DynamicPriorityService.PriorityDetails scoreA = (DynamicPriorityService.PriorityDetails) a.get("priority");
            DynamicPriorityService.PriorityDetails scoreB = (DynamicPriorityService.PriorityDetails) b.get("priority");
            int byScore = Double.compare(scoreB.getScore(), scoreA.getScore());
            if (byScore != 0) return byScore;
            int byToken = Comparator.nullsLast(Integer::compareTo)
                    .compare((Integer) a.get("baseToken"), (Integer) b.get("baseToken"));
            return byToken != 0 ? byToken : String.valueOf(a.get("id")).compareTo(String.valueOf(b.get("id")));
        });

        for (int i = 0; i < pendingAppointments.size(); i++) {
            pendingAppointments.get(i).put("queuePosition", i + 1);
            QueueEtaService.EtaDetails etaDetails = etaService.getPatientETA(pendingAppointments,
                    (String) pendingAppointments.get(i).get("id"),
                    QueueEtaService.DEFAULT_CONSULT_DURATION);
            pendingAppointments.get(i).put("estimatedWait", etaDetails.getEstimatedWait());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("nowServing", nowServing);
        response.put("waitingQueue", pendingAppointments);
        response.put("queue", pendingAppointments);
        response.put("totalWaiting", pendingAppointments.size());
        response.put("updatedAt", LocalDateTime.now().toString());

        return ResponseEntity.ok(response);
    }

    @GetMapping({
            "/patient/{appointmentId}",
            "/patient-eta/{appointmentId}",
            "/eta/{appointmentId}"
    })
    public ResponseEntity<?> getPatientEtaByPath(@PathVariable String appointmentId) {
        return getPatientQueueStatus(appointmentId);
    }

    @GetMapping({"/patient-eta", "/eta"})
    public ResponseEntity<?> getPatientEta(@RequestParam String appointmentId) {
        return getPatientQueueStatus(appointmentId);
    }

    @GetMapping({"/patient-position/{appointmentId}", "/position/{appointmentId}"})
    public ResponseEntity<?> getPatientQueuePositionByPath(@PathVariable String appointmentId) {
        return getPatientQueueStatus(appointmentId);
    }

    @GetMapping({"/patient-position", "/position"})
    public ResponseEntity<?> getPatientQueuePosition(@RequestParam String appointmentId) {
        return getPatientQueueStatus(appointmentId);
    }

    private ResponseEntity<?> getPatientQueueStatus(String appointmentId) {
        if (appointmentId == null || appointmentId.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "appointmentId is required"));
        }

        Optional<Appointment> opt = appointmentRepository.findById(appointmentId);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Appointment not found"));
        }

        Appointment targetAppt = opt.get();
        if (List.of("Completed", "Cancelled", "Missed", "Postponed").contains(targetAppt.getStatus())) {
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("status", targetAppt.getStatus());
            resp.put("patientName", targetAppt.getPatientName());
            resp.put("tokenNumber", targetAppt.getBaseToken());
            resp.put("nowServingToken", null);
            resp.put("queuePosition", 0);
            resp.put("estimatedWait", null);
            resp.put("updatedAt", LocalDateTime.now().toString());
            return ResponseEntity.ok(resp);
        }

        if ("In_Progress".equals(targetAppt.getStatus())) {
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("status", "In_Progress");
            resp.put("patientName", targetAppt.getPatientName());
            resp.put("tokenNumber", targetAppt.getBaseToken());
            resp.put("nowServingToken", targetAppt.getBaseToken());
            resp.put("queuePosition", 0);
            resp.put("estimatedWait", Map.of("min", 0, "max", 0));
            resp.put("updatedAt", LocalDateTime.now().toString());
            return ResponseEntity.ok(resp);
        }

        String today = LocalDate.now().toString();
        if (!today.equals(targetAppt.getDate())) {
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("status", targetAppt.getStatus());
            resp.put("patientName", targetAppt.getPatientName());
            resp.put("tokenNumber", targetAppt.getBaseToken());
            resp.put("nowServingToken", null);
            resp.put("queuePosition", 0);
            resp.put("estimatedWait", null);
            resp.put("message", "Appointment is not in today's queue");
            resp.put("updatedAt", LocalDateTime.now().toString());
            return ResponseEntity.ok(resp);
        }

        if ("Confirmed".equals(targetAppt.getStatus()) || "Rescheduled".equals(targetAppt.getStatus())) {
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("status", targetAppt.getStatus());
            resp.put("patientName", targetAppt.getPatientName());
            resp.put("tokenNumber", targetAppt.getBaseToken());
            resp.put("nowServingToken", null);
            resp.put("queuePosition", 0);
            resp.put("estimatedWait", null);
            resp.put("message", "Check in during the appointment window to join the queue");
            resp.put("updatedAt", LocalDateTime.now().toString());
            return ResponseEntity.ok(resp);
        }

        String doctorId = targetAppt.getDoctorId();
        Query query = new Query(new Criteria().andOperator(
                MongoIdUtil.idCriteria("doctorId", doctorId),
                Criteria.where("date").is(targetAppt.getDate()),
                Criteria.where("status").in(List.of("Pending", "In_Progress"))
        ));
        List<Appointment> appointments = mongoTemplate.find(query, Appointment.class);
        String targetFacility = targetAppt.getHospitalId() == null || targetAppt.getHospitalId().isBlank()
                ? "private" : "hospital";
        appointments.removeIf(a -> !MongoIdUtil.matchesHospitalFilter(a.getHospitalId(), targetFacility));

        LocalDateTime currentTime = LocalDateTime.now();
        List<Map<String, Object>> queue = new ArrayList<>();

        for (Appointment a : appointments) {
            if (!"In_Progress".equals(a.getStatus())) {
                Map<String, Object> m = new HashMap<>();
                m.put("_id", a.getId());
                m.put("id", a.getId());
                m.put("patientName", a.getPatientName());
                m.put("baseToken", a.getBaseToken());
                m.put("priority", priorityService.calculateCEP(a, currentTime));
                queue.add(m);
            }
        }

        queue.sort((a, b) -> {
            DynamicPriorityService.PriorityDetails pA = (DynamicPriorityService.PriorityDetails) a.get("priority");
            DynamicPriorityService.PriorityDetails pB = (DynamicPriorityService.PriorityDetails) b.get("priority");
            int byScore = Double.compare(pB.getScore(), pA.getScore());
            if (byScore != 0) return byScore;
            int byToken = Comparator.nullsLast(Integer::compareTo)
                    .compare((Integer) a.get("baseToken"), (Integer) b.get("baseToken"));
            return byToken != 0 ? byToken : String.valueOf(a.get("id")).compareTo(String.valueOf(b.get("id")));
        });

        Integer nowServingToken = targetAppt.getBaseToken();
        Optional<Appointment> inProg = appointments.stream().filter(a -> "In_Progress".equals(a.getStatus())).findFirst();
        if (inProg.isPresent()) {
            nowServingToken = inProg.get().getBaseToken();
        } else if (!queue.isEmpty()) {
            nowServingToken = (Integer) queue.get(0).get("baseToken");
        }

        QueueEtaService.EtaDetails etaDetails = etaService.getPatientETA(queue, appointmentId, QueueEtaService.DEFAULT_CONSULT_DURATION);
        int queuePosition = 0;
        Map<String, Integer> estimatedWait = null;

        if (etaDetails != null) {
            queuePosition = etaDetails.getQueuePosition();
            estimatedWait = etaDetails.getEstimatedWait();
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("status", targetAppt.getStatus());
        resp.put("patientName", targetAppt.getPatientName());
        resp.put("tokenNumber", targetAppt.getBaseToken());
        resp.put("nowServingToken", nowServingToken);
        resp.put("queuePosition", queuePosition);
        resp.put("estimatedWait", estimatedWait);
        resp.put("updatedAt", LocalDateTime.now().toString());

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addToQueue(@RequestBody Map<String, String> body) {
        String docId = body.getOrDefault("doctorId", "");
        Map<String, Object> eventData = new HashMap<>();
        eventData.put("action", "ADD_TO_QUEUE");
        eventData.put("patientId", body.getOrDefault("patientId", ""));
        eventData.put("patientName", body.getOrDefault("patientName", ""));
        eventData.put("doctorId", docId);
        eventData.put("hospitalId", body.getOrDefault("hospitalId", ""));
        eventData.put("hospitalName", body.getOrDefault("hospitalName", ""));
        eventData.put("timestamp", LocalDateTime.now().toString());

        kafkaProducerService.publishQueueEvent(docId, eventData);
        return ResponseEntity.ok(Map.of("message", "Added to queue"));
    }

    @PostMapping("/call-next")
    public ResponseEntity<?> callNext(@RequestBody Map<String, String> body) {
        String doctorId = body.get("doctorId");
        String appointmentId = body.get("appointmentId");
        String hospitalId = body.get("hospitalId");

        Query inProgQuery = new Query(new Criteria().andOperator(
                MongoIdUtil.idCriteria("doctorId", doctorId),
                Criteria.where("status").is("In_Progress")
        ));
        List<Appointment> existingInConsult = mongoTemplate.find(inProgQuery, Appointment.class);
        for (Appointment old : existingInConsult) {
            if (hospitalId != null && !hospitalId.isBlank()
                    && !MongoIdUtil.matchesHospitalFilter(old.getHospitalId(), hospitalId)) continue;
            old.setStatus("Pending");
            old.setMissedCalls((old.getMissedCalls() != null ? old.getMissedCalls() : 0) + 1);
            old.setUpdatedAt(Instant.now());
            appointmentRepository.save(old);
        }

        Appointment targetAppt = null;
        if (appointmentId != null && !appointmentId.isBlank()) {
            targetAppt = appointmentRepository.findById(appointmentId).orElse(null);
            if (targetAppt != null && (!Objects.equals(targetAppt.getDoctorId(), doctorId)
                    || !"Pending".equals(targetAppt.getStatus())
                    || (hospitalId != null && !hospitalId.isBlank()
                    && !MongoIdUtil.matchesHospitalFilter(targetAppt.getHospitalId(), hospitalId)))) {
                targetAppt = null;
            }
        }

        if (targetAppt == null) {
            String today = LocalDate.now().toString();
            Query pendingQuery = new Query(new Criteria().andOperator(
                    MongoIdUtil.idCriteria("doctorId", doctorId),
                    Criteria.where("date").is(today),
                    Criteria.where("status").is("Pending")
            ));
            List<Appointment> pending = mongoTemplate.find(pendingQuery, Appointment.class);
            if (hospitalId != null && !hospitalId.isBlank()) {
                pending.removeIf(a -> !MongoIdUtil.matchesHospitalFilter(a.getHospitalId(), hospitalId));
            }

            if (!pending.isEmpty()) {
                LocalDateTime now = LocalDateTime.now();
                pending.sort((a, b) -> {
                    double sA = priorityService.calculateCEP(a, now).getScore();
                    double sB = priorityService.calculateCEP(b, now).getScore();
                    int byScore = Double.compare(sB, sA);
                    if (byScore != 0) return byScore;
                    int byToken = Comparator.nullsLast(Integer::compareTo).compare(a.getBaseToken(), b.getBaseToken());
                    return byToken != 0 ? byToken : String.valueOf(a.getId()).compareTo(String.valueOf(b.getId()));
                });
                targetAppt = pending.get(0);
            }
        }

        if (targetAppt == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "No patient available to call"));
        }

        targetAppt.setStatus("In_Progress");
        targetAppt.setUpdatedAt(Instant.now());
        appointmentRepository.save(targetAppt);

        Map<String, Object> eventData = new HashMap<>();
        eventData.put("action", "CALL_NEXT");
        eventData.put("doctorId", doctorId != null ? doctorId : "");
        eventData.put("patientId", targetAppt.getPatientId() != null ? targetAppt.getPatientId() : "");
        eventData.put("appointmentId", targetAppt.getId());
        eventData.put("tokenNumber", targetAppt.getBaseToken());
        eventData.put("timestamp", LocalDateTime.now().toString());

        kafkaProducerService.publishQueueEvent(doctorId, eventData);

        return ResponseEntity.ok(Map.of("message", "Patient started consultation", "targetAppt", targetAppt));
    }

    @PostMapping("/skip")
    public ResponseEntity<?> skipPatient(@RequestBody Map<String, String> body) {
        String appointmentId = body.get("appointmentId");
        String doctorId = body.getOrDefault("doctorId", "");
        String patientId = body.getOrDefault("patientId", "");
        String hospitalId = body.getOrDefault("hospitalId", "");
        String hospitalName = body.getOrDefault("hospitalName", "");

        if (appointmentId != null) {
            Optional<Appointment> aptOpt = appointmentRepository.findById(appointmentId);
            if (aptOpt.isPresent()) {
                Appointment appt = aptOpt.get();
                appt.setMissedCalls((appt.getMissedCalls() != null ? appt.getMissedCalls() : 0) + 1);
                appt.setStatus("Pending");
                appt.setUpdatedAt(Instant.now());
                appointmentRepository.save(appt);
                patientId = appt.getPatientId() != null ? appt.getPatientId() : patientId;
                hospitalId = appt.getHospitalId() != null ? appt.getHospitalId() : hospitalId;
                hospitalName = appt.getHospitalName() != null ? appt.getHospitalName() : hospitalName;
            }
        }

        Map<String, Object> eventData = new HashMap<>();
        eventData.put("action", "SKIP_PATIENT");
        eventData.put("doctorId", doctorId);
        eventData.put("patientId", patientId);
        eventData.put("appointmentId", appointmentId);
        eventData.put("hospitalId", hospitalId);
        eventData.put("hospitalName", hospitalName);
        eventData.put("timestamp", LocalDateTime.now().toString());

        kafkaProducerService.publishQueueEvent(doctorId, eventData);
        return ResponseEntity.ok(Map.of("message", "Patient skipped and penalized"));
    }

    @PostMapping("/complete")
    public ResponseEntity<?> completeConsultation(@RequestBody Map<String, String> body) {
        String appointmentId = body.get("appointmentId");
        String doctorId = body.getOrDefault("doctorId", "");
        String patientId = body.getOrDefault("patientId", "");
        String hospitalId = body.getOrDefault("hospitalId", "");
        String hospitalName = body.getOrDefault("hospitalName", "");

        if (appointmentId != null) {
            Optional<Appointment> aptOpt = appointmentRepository.findById(appointmentId);
            if (aptOpt.isPresent()) {
                Appointment appt = aptOpt.get();
                appt.setStatus("Completed");
                appt.setUpdatedAt(Instant.now());
                appointmentRepository.save(appt);
                patientId = appt.getPatientId() != null ? appt.getPatientId() : patientId;
                hospitalId = appt.getHospitalId() != null ? appt.getHospitalId() : hospitalId;
                hospitalName = appt.getHospitalName() != null ? appt.getHospitalName() : hospitalName;
            }
        }

        Map<String, Object> eventData = new HashMap<>();
        eventData.put("action", "CONSULTATION_COMPLETE");
        eventData.put("doctorId", doctorId);
        eventData.put("patientId", patientId);
        eventData.put("appointmentId", appointmentId);
        eventData.put("hospitalId", hospitalId);
        eventData.put("hospitalName", hospitalName);
        eventData.put("timestamp", LocalDateTime.now().toString());

        kafkaProducerService.publishQueueEvent(doctorId, eventData);
        return ResponseEntity.ok(Map.of("message", "Consultation marked complete"));
    }
}
