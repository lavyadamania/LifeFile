package com.lifefile.scos.repository;

import com.lifefile.scos.model.JoinRequest;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;
import java.util.Optional;

public interface JoinRequestRepository extends MongoRepository<JoinRequest, String> {

    @Query("{ '$or': [ { 'hospitalId': ?0 }, { 'hospitalId': ?1 } ] }")
    List<JoinRequest> findByHospitalIdStringOrObjectId(String hospitalIdStr, ObjectId hospitalIdObj);

    @Query("{ 'hospitalId': ?0 }")
    List<JoinRequest> findByHospitalIdString(String hospitalId);

    default List<JoinRequest> findByHospitalId(String hospitalId) {
        if (hospitalId == null || hospitalId.isBlank()) return List.of();
        if (ObjectId.isValid(hospitalId)) {
            return findByHospitalIdStringOrObjectId(hospitalId, new ObjectId(hospitalId));
        }
        return findByHospitalIdString(hospitalId);
    }

    @Query("{ '$or': [ { 'doctorId': ?0 }, { 'doctorId': ?1 } ] }")
    List<JoinRequest> findByDoctorIdStringOrObjectId(String doctorIdStr, ObjectId doctorIdObj);

    @Query("{ 'doctorId': ?0 }")
    List<JoinRequest> findByDoctorIdString(String doctorId);

    default List<JoinRequest> findByDoctorId(String doctorId) {
        if (doctorId == null || doctorId.isBlank()) return List.of();
        if (ObjectId.isValid(doctorId)) {
            return findByDoctorIdStringOrObjectId(doctorId, new ObjectId(doctorId));
        }
        return findByDoctorIdString(doctorId);
    }

    @Query("{ '$and': [ { '$or': [ { 'hospitalId': ?0 }, { 'hospitalId': ?1 } ] }, { 'status': ?2 } ] }")
    List<JoinRequest> findByHospitalIdAndStatusStringOrObjectId(String hospitalIdStr, ObjectId hospitalIdObj, String status);

    @Query("{ 'hospitalId': ?0, 'status': ?1 }")
    List<JoinRequest> findByHospitalIdAndStatusString(String hospitalId, String status);

    default List<JoinRequest> findByHospitalIdAndStatus(String hospitalId, String status) {
        if (hospitalId == null || hospitalId.isBlank()) return List.of();
        if (ObjectId.isValid(hospitalId)) {
            return findByHospitalIdAndStatusStringOrObjectId(hospitalId, new ObjectId(hospitalId), status);
        }
        return findByHospitalIdAndStatusString(hospitalId, status);
    }

    @Query("{ '$and': [ { '$or': [ { 'doctorId': ?0 }, { 'doctorId': ?1 } ] }, { '$or': [ { 'hospitalId': ?2 }, { 'hospitalId': ?3 } ] }, { 'status': ?4 } ] }")
    Optional<JoinRequest> findByDoctorIdAndHospitalIdAndStatusFlexible(String doctorIdStr, ObjectId doctorIdObj, String hospitalIdStr, ObjectId hospitalIdObj, String status);

    default Optional<JoinRequest> findByDoctorIdAndHospitalIdAndStatus(String doctorId, String hospitalId, String status) {
        ObjectId docOid = (doctorId != null && ObjectId.isValid(doctorId)) ? new ObjectId(doctorId) : null;
        ObjectId hospOid = (hospitalId != null && ObjectId.isValid(hospitalId)) ? new ObjectId(hospitalId) : null;
        return findByDoctorIdAndHospitalIdAndStatusFlexible(doctorId, docOid, hospitalId, hospOid, status);
    }
}

