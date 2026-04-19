package com.aryogasutra.service;

import com.aryogasutra.dto.DoshaAnswerDto;
import com.aryogasutra.dto.DoshaResultDto;
import com.aryogasutra.dto.DoshaSubmitRequest;
import com.aryogasutra.entity.DoshaResult;
import com.aryogasutra.entity.Role;
import com.aryogasutra.repository.DoshaResultRepository;
import com.aryogasutra.repository.PatientRepository;
import com.aryogasutra.security.UserPrincipal;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DoshaService {

    private final ObjectMapper objectMapper;
    private final DoshaResultRepository doshaResultRepository;
    private final PatientRepository patientRepository;

    private volatile List<JsonNode> cachedQuestions;

    public List<JsonNode> getQuestions() {
        if (cachedQuestions == null) {
            synchronized (this) {
                if (cachedQuestions == null) {
                    try (InputStream in = new ClassPathResource("dosha-questions.json").getInputStream()) {
                        cachedQuestions = objectMapper.readValue(in, new TypeReference<>() {});
                    } catch (IOException e) {
                        throw new IllegalStateException("dosha-questions.json missing", e);
                    }
                }
            }
        }
        return cachedQuestions;
    }

    @Transactional
    public DoshaResultDto submit(DoshaSubmitRequest req, UserPrincipal user) {
        if (user.getRole() != Role.PATIENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Patients only");
        }
        var patient =
                patientRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        List<JsonNode> questions = getQuestions();
        Map<String, JsonNode> byId = new HashMap<>();
        for (JsonNode q : questions) {
            byId.put(q.get("id").asText(), q);
        }

        int vata = 0, pitta = 0, kapha = 0;
        for (DoshaAnswerDto a : req.getAnswers()) {
            JsonNode q = byId.get(a.getQuestionId());
            if (q == null || !q.has("options")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown question: " + a.getQuestionId());
            }
            JsonNode opts = q.get("options");
            if (a.getOptionIndex() < 0 || a.getOptionIndex() >= opts.size()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid option for " + a.getQuestionId());
            }
            JsonNode opt = opts.get(a.getOptionIndex());
            vata += opt.path("vata").asInt(0);
            pitta += opt.path("pitta").asInt(0);
            kapha += opt.path("kapha").asInt(0);
        }

        String dominant;
        if (vata >= pitta && vata >= kapha) {
            dominant = "Vata";
        } else if (pitta >= kapha) {
            dominant = "Pitta";
        } else {
            dominant = "Kapha";
        }

        DoshaResult saved =
                doshaResultRepository.save(
                        DoshaResult.builder()
                                .patientId(patient.getId())
                                .vataScore(vata)
                                .pittaScore(pitta)
                                .kaphaScore(kapha)
                                .dominantDosha(dominant)
                                .createdAt(Instant.now())
                                .build());

        patient.setDosha(dominant);
        patientRepository.save(patient);

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public DoshaResultDto latestForPatient(Long patientId, UserPrincipal user) {
        authorizePatientOrStaff(patientId, user);
        return doshaResultRepository
                .findTopByPatientIdOrderByCreatedAtDesc(patientId)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private void authorizePatientOrStaff(Long patientId, UserPrincipal user) {
        if (user.getRole() == Role.PATIENT) {
            var mine =
                    patientRepository
                            .findByUserId(user.getId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            if (!mine.getId().equals(patientId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            }
        } else if (user.getRole() != Role.DOCTOR && user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }

    private DoshaResultDto toDto(DoshaResult r) {
        return DoshaResultDto.builder()
                .id(r.getId())
                .patientId(r.getPatientId())
                .vataScore(r.getVataScore())
                .pittaScore(r.getPittaScore())
                .kaphaScore(r.getKaphaScore())
                .dominantDosha(r.getDominantDosha())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
