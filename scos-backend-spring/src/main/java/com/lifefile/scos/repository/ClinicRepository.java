package com.lifefile.scos.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.lifefile.scos.model.Clinic;

public interface ClinicRepository extends MongoRepository<Clinic, String> {
	Optional<Clinic> findByDoctorId(String doctorId);
}
