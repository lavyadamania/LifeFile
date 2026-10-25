package com.lifefile.scos.repository;

import com.lifefile.scos.model.MedicalRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MedicalRecordRepository extends MongoRepository<MedicalRecord, String> {
    List<MedicalRecord> findByPatientId(String patientId);
    List<MedicalRecord> findByPatientIdIn(List<String> patientIds);
}
