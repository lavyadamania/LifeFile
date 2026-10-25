package com.lifefile.scos.repository;

import com.lifefile.scos.model.User;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    @Query("{ '$or': [ { '_id': ?0 }, { '_id': ?1 } ] }")
    Optional<User> findByIdStringOrObjectId(String idStr, ObjectId idObj);

    default Optional<User> findByIdFlexible(String id) {
        if (id == null || id.isBlank()) return Optional.empty();
        Optional<User> u = findById(id);
        if (u.isPresent()) return u;
        if (ObjectId.isValid(id)) {
            return findByIdStringOrObjectId(id, new ObjectId(id));
        }
        return Optional.empty();
    }
}
