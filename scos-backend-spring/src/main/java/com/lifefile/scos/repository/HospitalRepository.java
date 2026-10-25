package com.lifefile.scos.repository;

import com.lifefile.scos.model.Hospital;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;
import java.util.Optional;

public interface HospitalRepository extends MongoRepository<Hospital, String> {

    @Query("{ '$or': [ { 'userId': ?0 }, { 'userId': ?1 } ] }")
    Optional<Hospital> findByUserIdStringOrObjectId(String userIdStr, ObjectId userIdObj);

    @Query("{ 'userId': ?0 }")
    Optional<Hospital> findByUserIdString(String userId);

    default Optional<Hospital> findByUserId(String userId) {
        if (userId == null || userId.isBlank()) return Optional.empty();
        if (ObjectId.isValid(userId)) {
            return findByUserIdStringOrObjectId(userId, new ObjectId(userId));
        }
        return findByUserIdString(userId);
    }

    Optional<Hospital> findByEmail(String email);

    @Query("{ '$or': [ { 'doctors': ?0 }, { 'doctors': ?1 } ] }")
    List<Hospital> findByDoctorsContainingStringOrObjectId(String doctorIdStr, ObjectId doctorIdObj);

    @Query("{ 'doctors': ?0 }")
    List<Hospital> findByDoctorsContainingString(String doctorId);

    default List<Hospital> findByDoctorsContaining(String doctorId) {
        if (doctorId == null || doctorId.isBlank()) return List.of();
        if (ObjectId.isValid(doctorId)) {
            return findByDoctorsContainingStringOrObjectId(doctorId, new ObjectId(doctorId));
        }
        return findByDoctorsContainingString(doctorId);
    }

    List<Hospital> findByNameContainingIgnoreCase(String name);
}
