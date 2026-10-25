package com.lifefile.scos.repository;

import com.lifefile.scos.model.Doctor;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends MongoRepository<Doctor, String> {

    @Query("{ '$or': [ { 'userId': ?0 }, { 'userId': ?1 } ] }")
    Optional<Doctor> findByUserIdStringOrObjectId(String userIdStr, ObjectId userIdObj);

    @Query("{ 'userId': ?0 }")
    Optional<Doctor> findByUserIdString(String userId);

    default Optional<Doctor> findByUserId(String userId) {
        if (userId == null || userId.isBlank()) return Optional.empty();
        if (ObjectId.isValid(userId)) {
            return findByUserIdStringOrObjectId(userId, new ObjectId(userId));
        }
        return findByUserIdString(userId);
    }

    @Query("{ '$or': [ { 'hospitals': ?0 }, { 'hospitals': ?1 } ] }")
    List<Doctor> findByHospitalsContainingStringOrObjectId(String hospitalIdStr, ObjectId hospitalIdObj);

    @Query("{ 'hospitals': ?0 }")
    List<Doctor> findByHospitalsContainingString(String hospitalId);

    default List<Doctor> findByHospitalsContaining(String hospitalId) {
        if (hospitalId == null || hospitalId.isBlank()) return List.of();
        if (ObjectId.isValid(hospitalId)) {
            return findByHospitalsContainingStringOrObjectId(hospitalId, new ObjectId(hospitalId));
        }
        return findByHospitalsContainingString(hospitalId);
    }

    List<Doctor> findByNameContainingIgnoreCase(String name);
}
