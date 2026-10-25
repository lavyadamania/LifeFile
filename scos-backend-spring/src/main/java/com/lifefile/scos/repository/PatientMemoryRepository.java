package com.lifefile.scos.repository;

import com.lifefile.scos.model.PatientMemory;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PatientMemoryRepository extends MongoRepository<PatientMemory, String> {
    List<PatientMemory> findByPatientId(String patientId);
    List<PatientMemory> findByPatientIdAndStatus(String patientId, String status);
    List<PatientMemory> findByPatientIdAndCategoryAndStatus(String patientId, String category, String status);
    void deleteByPatientId(String patientId);
}
