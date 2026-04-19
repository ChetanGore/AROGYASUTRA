package com.aryogasutra.service;

import com.aryogasutra.dto.PatientDto;
import com.aryogasutra.dto.PatientUpdateRequest;
import com.aryogasutra.entity.Patient;
import com.aryogasutra.entity.Role;
import com.aryogasutra.repository.PatientRepository;
import com.aryogasutra.security.UserPrincipal;
import com.aryogasutra.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public List<PatientDto> listAll(UserPrincipal user) {
        if (user.getRole() != Role.DOCTOR && user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return patientRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public PatientDto getById(Long id, UserPrincipal user) {
        Patient p =
                patientRepository
                        .findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (user.getRole() == Role.PATIENT) {
            Patient mine =
                    patientRepository
                            .findByUserId(user.getId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            if (!mine.getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            }
        } else if (user.getRole() != Role.DOCTOR && user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        return toDto(p);
    }

    @Transactional(readOnly = true)
    public PatientDto getMine(UserPrincipal user) {
        if (user.getRole() != Role.PATIENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Patients only");
        }
        Patient p =
                patientRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return toDto(p);
    }

    @Transactional
    public PatientDto updateMine(PatientUpdateRequest req) {
        UserPrincipal user = SecurityUtils.currentUser();
        if (user.getRole() != Role.PATIENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Patients only");
        }
        Patient p =
                patientRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (req.getName() != null) p.setName(req.getName());
        if (req.getAge() != null) p.setAge(req.getAge());
        if (req.getGender() != null) p.setGender(req.getGender());
        if (req.getSymptoms() != null) p.setSymptoms(req.getSymptoms());
        if (req.getDisease() != null) p.setDisease(req.getDisease());
        if (req.getDosha() != null) p.setDosha(req.getDosha());
        if (req.getMedicalHistory() != null) p.setMedicalHistory(req.getMedicalHistory());

        return toDto(patientRepository.save(p));
    }

    @Transactional
    public PatientDto uploadReport(MultipartFile file) throws IOException {
        UserPrincipal user = SecurityUtils.currentUser();
        if (user.getRole() != Role.PATIENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        Patient p =
                patientRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String path = fileStorageService.storePatientReport(p.getId(), file);
        p.setReportFilePath(path);
        return toDto(patientRepository.save(p));
    }

    @Transactional
    public void saveAiSnapshot(Long patientId, String disease, String remedy, String yoga) {
        patientRepository
                .findById(patientId)
                .ifPresent(
                        p -> {
                            p.setLastAiDisease(disease);
                            p.setLastAiRemedy(remedy);
                            p.setLastAiYoga(yoga);
                            p.setLastAiAt(java.time.Instant.now());
                            patientRepository.save(p);
                        });
    }

    public Patient getEntityForReport(Long patientId) {
        return patientRepository
                .findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private PatientDto toDto(Patient p) {
        return PatientDto.builder()
                .id(p.getId())
                .userId(p.getUserId())
                .name(p.getName())
                .age(p.getAge())
                .gender(p.getGender())
                .symptoms(p.getSymptoms())
                .disease(p.getDisease())
                .dosha(p.getDosha())
                .medicalHistory(p.getMedicalHistory())
                .reportFilePath(p.getReportFilePath())
                .lastAiDisease(p.getLastAiDisease())
                .lastAiRemedy(p.getLastAiRemedy())
                .lastAiYoga(p.getLastAiYoga())
                .lastAiAt(p.getLastAiAt())
                .build();
    }
}
