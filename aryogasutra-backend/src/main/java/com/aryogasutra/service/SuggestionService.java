package com.aryogasutra.service;

import com.aryogasutra.dto.SuggestionDto;
import com.aryogasutra.dto.SuggestionRequest;
import com.aryogasutra.entity.Doctor;
import com.aryogasutra.entity.DoctorSuggestion;
import com.aryogasutra.entity.Patient;
import com.aryogasutra.entity.Role;
import com.aryogasutra.repository.DoctorRepository;
import com.aryogasutra.repository.DoctorSuggestionRepository;
import com.aryogasutra.repository.PatientRepository;
import com.aryogasutra.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SuggestionService {

    private final DoctorSuggestionRepository suggestionRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;

    @Transactional
    public SuggestionDto add(SuggestionRequest req, UserPrincipal user) {
        if (user.getRole() != Role.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Doctors only");
        }
        Doctor doctor =
                doctorRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Patient patient =
                patientRepository
                        .findById(req.getPatientId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        DoctorSuggestion s =
                DoctorSuggestion.builder()
                        .doctor(doctor)
                        .patient(patient)
                        .suggestionText(req.getSuggestionText().trim())
                        .createdAt(Instant.now())
                        .build();
        s = suggestionRepository.save(s);
        return toDto(s);
    }

    @Transactional(readOnly = true)
    public List<SuggestionDto> listForPatient(Long patientId, UserPrincipal user) {
        if (user.getRole() == Role.DOCTOR) {
            // Doctors can view suggestions for any patient they are treating
            return suggestionRepository.findByPatientIdWithDetails(patientId).stream()
                    .map(this::toDto)
                    .toList();
        }
        if (user.getRole() == Role.PATIENT) {
            Patient mine =
                    patientRepository
                            .findByUserId(user.getId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            if (!mine.getId().equals(patientId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            }
            return suggestionRepository.findByPatientIdWithDetails(patientId).stream()
                    .map(this::toDto)
                    .toList();
        }
        if (user.getRole() == Role.ADMIN) {
            return suggestionRepository.findByPatientIdWithDetails(patientId).stream()
                    .map(this::toDto)
                    .toList();
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    private SuggestionDto toDto(DoctorSuggestion s) {
        return SuggestionDto.builder()
                .id(s.getId())
                .doctorId(s.getDoctor().getId())
                .doctorName(s.getDoctor().getName())
                .patientId(s.getPatient().getId())
                .patientName(s.getPatient().getName())
                .suggestionText(s.getSuggestionText())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
