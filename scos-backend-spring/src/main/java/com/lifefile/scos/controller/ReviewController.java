package com.lifefile.scos.controller;

import com.lifefile.scos.model.Appointment;
import com.lifefile.scos.model.Doctor;
import com.lifefile.scos.model.Review;
import com.lifefile.scos.model.User;
import com.lifefile.scos.repository.DoctorRepository;
import com.lifefile.scos.repository.ReviewRepository;
import com.lifefile.scos.repository.UserRepository;
import com.lifefile.scos.util.MongoIdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * ReviewController — replaces routes/reviews.js
 */
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    @GetMapping("/{doctorId}")
    public ResponseEntity<?> getDoctorReviews(@PathVariable String doctorId) {
        List<Review> reviews = reviewRepository.findByDoctorId(doctorId);
        reviews.sort((a, b) -> {
            Instant left = a.getCreatedAt() == null ? Instant.EPOCH : a.getCreatedAt();
            Instant right = b.getCreatedAt() == null ? Instant.EPOCH : b.getCreatedAt();
            return right.compareTo(left);
        });

        List<Map<String, Object>> publicReviews = reviews.stream().map(review -> {
            User patient = userRepository.findByIdFlexible(review.getPatientId()).orElse(null);
            Map<String, Object> patientView = new LinkedHashMap<>();
            patientView.put("_id", review.getPatientId());
            patientView.put("name", patient == null ? "Anonymous Patient" : patient.getName());

            Map<String, Object> reviewView = new LinkedHashMap<>();
            reviewView.put("_id", review.getId());
            reviewView.put("doctorId", review.getDoctorId());
            reviewView.put("patientId", patientView);
            reviewView.put("appointmentId", review.getAppointmentId());
            reviewView.put("rating", review.getRating());
            reviewView.put("comment", review.getComment());
            reviewView.put("createdAt", review.getCreatedAt());
            return reviewView;
        }).toList();
        return ResponseEntity.ok(publicReviews);
    }

    @PostMapping
    public ResponseEntity<?> createReview(@RequestBody Review reviewData, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        if (reviewData.getDoctorId() == null || reviewData.getDoctorId().isBlank()
                || reviewData.getAppointmentId() == null || reviewData.getAppointmentId().isBlank()
                || reviewData.getRating() == null || reviewData.getRating() < 1 || reviewData.getRating() > 5) {
            return ResponseEntity.badRequest().body(Map.of("error", "Doctor, appointment, and a rating from 1 to 5 are required"));
        }

        Query appointmentQuery = new Query();
        appointmentQuery.addCriteria(MongoIdUtil.idCriteria("_id", reviewData.getAppointmentId()));
        appointmentQuery.addCriteria(MongoIdUtil.idCriteria("patientId", user.getId()));
        Appointment appointment = mongoTemplate.findOne(appointmentQuery, Appointment.class);
        if (appointment == null || !"Completed".equalsIgnoreCase(appointment.getStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only your completed appointments can be reviewed"));
        }
        if (!reviewData.getDoctorId().equals(appointment.getDoctorId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "The review doctor does not match the appointment"));
        }
        if (reviewRepository.existsByAppointmentId(reviewData.getAppointmentId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "This appointment has already been reviewed"));
        }

        reviewData.setPatientId(user.getId());
        reviewData.setCreatedAt(Instant.now());
        reviewData.setUpdatedAt(Instant.now());
        Review saved = reviewRepository.save(reviewData);

        // Update doctor rating
        List<Review> allReviews = reviewRepository.findByDoctorId(reviewData.getDoctorId());
        double sum = allReviews.stream().filter(review -> review.getRating() != null).mapToDouble(Review::getRating).sum();
        double avg = allReviews.isEmpty() ? 0 : sum / allReviews.size();

        Optional<Doctor> docOpt = doctorRepository.findById(reviewData.getDoctorId());
        if (docOpt.isPresent()) {
            Doctor doc = docOpt.get();
            doc.setRating(Math.round(avg * 10.0) / 10.0);
            doc.setReviewCount(allReviews.size());
            doctorRepository.save(doc);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
