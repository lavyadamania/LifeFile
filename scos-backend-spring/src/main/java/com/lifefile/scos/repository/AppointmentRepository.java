package com.lifefile.scos.repository;

import com.lifefile.scos.model.Appointment;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AppointmentRepository extends MongoRepository<Appointment, String> {
    List<Appointment> findByDoctorId(String doctorId);
    List<Appointment> findByPatientId(String patientId);
    List<Appointment> findByDoctorIdAndStatus(String doctorId, String status);
    List<Appointment> findByDoctorIdAndDate(String doctorId, String date);
    List<Appointment> findByHospitalId(String hospitalId);
    List<Appointment> findByDoctorIdAndDateAndStatusIn(String doctorId, String date, List<String> statuses);
    long countByDoctorIdAndStatus(String doctorId, String status);
    List<Appointment> findByStatus(String status);
    List<Appointment> findByStatusIn(List<String> statuses);
    List<Appointment> findByDoctorIdAndStatusIn(String doctorId, List<String> statuses);
}
