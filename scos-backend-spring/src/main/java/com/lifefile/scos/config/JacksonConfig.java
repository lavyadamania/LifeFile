package com.lifefile.scos.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.BeanSerializerModifier;
import com.fasterxml.jackson.databind.BeanDescription;
import com.fasterxml.jackson.databind.SerializationConfig;
import com.fasterxml.jackson.databind.ser.BeanPropertyWriter;
import com.fasterxml.jackson.core.io.SerializedString;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Adds "_id" as a virtual alias for "id" on every JSON response.
 * This makes Spring Boot responses compatible with the frontend that uses
 * MongoDB's native _id field naming convention (from the old Node.js backend).
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
        ObjectMapper mapper = builder.build();
        SimpleModule module = new SimpleModule();
        module.setSerializerModifier(new IdAliasSerializerModifier());
        mapper.registerModule(module);
        return mapper;
    }

    /**
     * BeanSerializerModifier that appends a virtual "_id" writer
     * whenever the bean has an "id" property (our MongoDB @Id field).
     */
    static class IdAliasSerializerModifier extends BeanSerializerModifier {
        @Override
        public List<BeanPropertyWriter> changeProperties(
                SerializationConfig config,
                BeanDescription beanDesc,
                List<BeanPropertyWriter> beanProperties) {

            boolean hasId = beanProperties.stream()
                    .anyMatch(p -> "id".equals(p.getName()));

            if (hasId) {
                // Find the "id" writer and create an alias "_id" writer
                for (BeanPropertyWriter w : beanProperties) {
                    if ("id".equals(w.getName())) {
                        List<BeanPropertyWriter> result = new ArrayList<>(beanProperties);
                        result.add(new IdAliasWriter(w));
                        return result;
                    }
                }
            }
            return beanProperties;
        }
    }

    /**
     * Wraps an existing BeanPropertyWriter to output it under the name "_id".
     */
    static class IdAliasWriter extends BeanPropertyWriter {
        IdAliasWriter(BeanPropertyWriter delegate) {
            super(delegate, new SerializedString("_id"));
        }
    }
}
