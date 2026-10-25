package com.lifefile.scos.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.lifefile.scos.model.Review;

public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByDoctorId(String doctorId);
    List<Review> findByPatientId(String patientId);
    boolean existsByDoctorIdAndPatientId(String doctorId, String patientId);
    boolean existsByAppointmentId(String appointmentId);
}
