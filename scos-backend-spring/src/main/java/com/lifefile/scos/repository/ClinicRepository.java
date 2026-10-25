package com.lifefile.scos.repository;

import com.lifefile.scos.model.Clinic;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ClinicRepository extends MongoRepository<Clinic, String> {}
