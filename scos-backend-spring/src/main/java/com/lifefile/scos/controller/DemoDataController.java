package com.lifefile.scos.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
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

    @Value("${app.demo.seed-working-directory:../scos-backend}")
    private String seedWorkingDirectory;

    @Value("${spring.data.mongodb.uri:mongodb://localhost:27017/scos}")
    private String mongoUri;

    @PostMapping("/reset")
    public ResponseEntity<?> resetDemoData() {
        File workingDirectory = findSeedWorkingDirectory();
        if (workingDirectory == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "Demo seeder is not available on this server"
            ));
        }

        File seedScript = new File(workingDirectory, "seed-presentation.js");

        try {
            ProcessBuilder processBuilder = new ProcessBuilder("node", seedScript.getName(), "--confirm")
                    .directory(workingDirectory)
                    .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                    .redirectError(ProcessBuilder.Redirect.DISCARD);
            processBuilder.environment().put("MONGO_URI", mongoUri);
            Process process = processBuilder.start();

            boolean completed = process.waitFor(SEED_TIMEOUT.toMinutes(), TimeUnit.MINUTES);
            if (!completed) {
                process.destroyForcibly();
                return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(Map.of(
                        "error", "Demo data reset timed out"
                ));
            }

            if (process.exitValue() != 0) {
                return ResponseEntity.internalServerError().body(Map.of(
                        "error", "Demo data reset failed. Check the backend logs."
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Demo data cleared and seeded successfully"
            ));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Demo data reset was interrupted"
            ));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "Unable to start the demo seeder. Check that Node.js is installed."
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