package com.lifefile.scos.controller;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Local demo-only endpoint for resetting and reseeding the presentation dataset. */
@RestController
@RequestMapping("/api/demo")
public class DemoDataController {

    private static final Duration SEED_TIMEOUT = Duration.ofMinutes(10);
    private static final Map<String, String> SEED_SCRIPTS = Map.ofEntries(
            Map.entry("admin", "seed.js"),
            Map.entry("presentation", "seed-presentation.js"),
            Map.entry("ananya", "seed-ananya-live.js"),
            Map.entry("clinics", "seed-clinics.js"),
            Map.entry("appointments", "seed-appointments.js"),
            Map.entry("basic-appointments", "seed_appointments.js"),
            Map.entry("hundred-appointments", "seed_100_appointments.js"),
            Map.entry("twenty-patients", "seed-20-patients.js"),
            Map.entry("distinct-patients", "seed-10-distinct.js"),
            Map.entry("realistic-queue", "seed-20-realistic.js"),
            Map.entry("dwpa-test", "seed-dwpa-test.js")
    );
    private static final List<String> ALL_SEEDS = List.of(
            "admin", "presentation", "ananya", "clinics", "appointments",
            "basic-appointments", "hundred-appointments", "twenty-patients",
            "distinct-patients", "realistic-queue", "dwpa-test"
    );

    @Value("${app.demo.seed-working-directory:../scos-backend}")
    private String seedWorkingDirectory;

    @Value("${spring.data.mongodb.uri:mongodb://localhost:27017/scos}")
    private String mongoUri;

    @PostMapping("/reset")
    public ResponseEntity<?> resetDemoData() {
        return runAllSeeds();
    }

    @PostMapping("/seed-all")
    public ResponseEntity<?> seedAllDemoScripts() {
        return runAllSeeds();
    }

    @PostMapping("/seed")
    public ResponseEntity<?> runSeedByName(@org.springframework.web.bind.annotation.RequestBody Map<String, String> body) {
        return runSeed(body.get("seed"));
    }

    private ResponseEntity<?> runSeed(String seedName) {
        String scriptName = SEED_SCRIPTS.get(seedName);
        if (scriptName == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Unknown demo seed: " + seedName
            ));
        }

        File workingDirectory = findSeedWorkingDirectory();
        if (workingDirectory == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "Demo seeder is not available on this server"
            ));
        }

        File seedScript = new File(workingDirectory, scriptName);
        if (!seedScript.isFile()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "Demo seed script is not available: " + scriptName
            ));
        }

        return executeSeed(seedName, seedScript, workingDirectory);
    }

    private ResponseEntity<?> runAllSeeds() {
        File workingDirectory = findSeedWorkingDirectory();
        if (workingDirectory == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "Demo seeder is not available on this server"
            ));
        }

        List<String> completed = new java.util.ArrayList<>();
        Map<String, String> failed = new LinkedHashMap<>();
        for (String seedName : ALL_SEEDS) {
            File seedScript = new File(workingDirectory, SEED_SCRIPTS.get(seedName));
            if (!seedScript.isFile()) {
                failed.put(seedName, "script missing: " + seedScript.getName());
                continue;
            }

            ResponseEntity<?> result = executeSeed(seedName, seedScript, workingDirectory);
            if (result.getStatusCode().is2xxSuccessful()) {
                completed.add(seedName);
            } else {
                Object body = result.getBody();
                String error = body instanceof Map<?, ?> response && response.get("error") != null
                        ? response.get("error").toString()
                        : "failed with HTTP " + result.getStatusCode().value();
                failed.put(seedName, error);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", failed.isEmpty()
                ? "All demo seed scripts completed successfully"
                : "Some demo seed scripts failed");
        result.put("completed", completed);
        result.put("failed", failed);
        if (!failed.isEmpty()) {
            result.put("error", "Seed failures: " + failed);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
        return ResponseEntity.ok(result);
    }

    private ResponseEntity<?> executeSeed(String seedName, File seedScript, File workingDirectory) {
        try {
            List<String> command = new java.util.ArrayList<>(List.of("node", seedScript.getName()));
            if ("presentation".equals(seedName)) command.add("--confirm");

            ProcessBuilder processBuilder = new ProcessBuilder(command)
                    .directory(workingDirectory)
                    .redirectErrorStream(true);
            processBuilder.environment().put("MONGO_URI", mongoUri);
            Process process = processBuilder.start();
            java.util.concurrent.CompletableFuture<String> outputFuture = java.util.concurrent.CompletableFuture.supplyAsync(() -> {
                try (InputStream stream = process.getInputStream()) {
                    return new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
                } catch (IOException e) {
                    return "Unable to read seed output: " + e.getMessage();
                }
            });

            boolean completed = process.waitFor(SEED_TIMEOUT.toMinutes(), TimeUnit.MINUTES);
            if (!completed) {
                process.destroyForcibly();
                return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(Map.of(
                        "error", seedName + " timed out"
                ));
            }
            String output = outputFuture.join();
            if (process.exitValue() != 0) {
                return ResponseEntity.internalServerError().body(Map.of(
                        "error", seedName + " failed with exit code " + process.exitValue()
                                + (output.isEmpty() ? "" : ": " + output)
                ));
            }
            return ResponseEntity.ok(Map.of("message", "Demo seed completed", "seed", seedName));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", seedName + " was interrupted"
            ));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "Unable to start " + seedName + ". Check that Node.js is installed."
            ));
        }
    }

    private File findSeedWorkingDirectory() {
        Path currentDirectory = Path.of(System.getProperty("user.dir"));
        List<Path> candidates = List.of(
                Path.of(seedWorkingDirectory),
                currentDirectory.resolve("scos-backend"),
                currentDirectory.resolve("../scos-backend"),
                currentDirectory.resolve("../../scos-backend")
        );

        return candidates.stream()
                .map(Path::toAbsolutePath)
                .map(Path::normalize)
                .map(Path::toFile)
                .filter(directory -> new File(directory, "seed-presentation.js").isFile())
                .findFirst()
                .orElse(null);
    }
}
