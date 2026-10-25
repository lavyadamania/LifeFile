package com.lifefile.scos.repository;

import com.lifefile.scos.model.Patient;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;
import java.util.Optional;

public interface PatientRepository extends MongoRepository<Patient, String> {

    @Query("{ '$or': [ { 'userId': ?0 }, { 'userId': ?1 } ] }")
    Optional<Patient> findByUserIdStringOrObjectId(String userIdStr, ObjectId userIdObj);

    @Query("{ 'userId': ?0 }")
    Optional<Patient> findByUserIdString(String userId);

    default Optional<Patient> findByUserId(String userId) {
        if (userId == null || userId.isBlank()) return Optional.empty();
        if (ObjectId.isValid(userId)) {
            return findByUserIdStringOrObjectId(userId, new ObjectId(userId));
        }
        return findByUserIdString(userId);
    }

    @Query("{ '$or': [ { 'currentHospital': ?0 }, { 'currentHospital': ?1 } ] }")
    List<Patient> findByCurrentHospitalStringOrObjectId(String hospitalIdStr, ObjectId hospitalIdObj);

    @Query("{ 'currentHospital': ?0 }")
    List<Patient> findByCurrentHospitalString(String hospitalId);

    default List<Patient> findByCurrentHospital(String hospitalId) {
        if (hospitalId == null || hospitalId.isBlank()) return List.of();
        if (ObjectId.isValid(hospitalId)) {
            return findByCurrentHospitalStringOrObjectId(hospitalId, new ObjectId(hospitalId));
        }
        return findByCurrentHospitalString(hospitalId);
    }

    List<Patient> findByNameContainingIgnoreCase(String name);
    List<Patient> findByGrantedDoctorsContaining(String doctorId);
}
