package com.lifefile.scos.util;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.query.Criteria;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class MongoIdUtil {

    public static Criteria idCriteria(String field, String id) {
        if (id == null) return Criteria.where(field).isNull();
        List<Object> values = new ArrayList<>();
        values.add(id);
        if (ObjectId.isValid(id)) {
            values.add(new ObjectId(id));
        }
        return Criteria.where(field).in(values);
    }

    public static Criteria idCriteria(String field, Collection<String> ids) {
        List<Object> values = new ArrayList<>();
        if (ids != null) {
            for (String id : ids) {
                if (id != null) {
                    values.add(id);
                    if (ObjectId.isValid(id)) {
                        values.add(new ObjectId(id));
                    }
                }
            }
        }
        return Criteria.where(field).in(values);
    }

    /**
     * Unified helper for checking hospital filter against an entity's hospitalId.
     * Supports: 'all', 'hospital', 'private', or specific hospitalId.
     */
    public static boolean matchesHospitalFilter(String actualHospitalId, String filter) {
        if (filter == null || filter.isBlank() || "all".equalsIgnoreCase(filter)) {
            return true;
        }
        boolean isPrivate = actualHospitalId == null || actualHospitalId.isBlank() || "private".equalsIgnoreCase(actualHospitalId);
        if ("private".equalsIgnoreCase(filter)) {
            return isPrivate;
        }
        if ("hospital".equalsIgnoreCase(filter)) {
            return !isPrivate;
        }
        return filter.equalsIgnoreCase(actualHospitalId);
    }
}
