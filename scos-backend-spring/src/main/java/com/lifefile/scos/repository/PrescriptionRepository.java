package com.lifefile.scos.repository;

import com.lifefile.scos.model.Prescription;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PrescriptionRepository extends MongoRepository<Prescription, String> {
    List<Prescription> findByPatientId(String patientId);
    List<Prescription> findByDoctorId(String doctorId);
    List<Prescription> findByPatientIdAndDoctorId(String patientId, String doctorId);
    List<Prescription> findByHospitalId(String hospitalId);
    List<Prescription> findByHospitalIdAndPatientId(String hospitalId, String patientId);
}
