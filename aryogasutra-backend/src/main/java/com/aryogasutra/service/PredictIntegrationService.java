package com.aryogasutra.service;

import com.aryogasutra.dto.PredictRequest;
import com.aryogasutra.dto.PredictResponse;
import com.aryogasutra.entity.Role;
import com.aryogasutra.repository.PatientRepository;
import com.aryogasutra.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PredictIntegrationService {

    private final MlProxyService mlProxyService;
    private final PatientRepository patientRepository;
    private final PatientService patientService;

    @Transactional
    public PredictResponse run(PredictRequest req, UserPrincipal user) {
        PredictResponse out = mlProxyService.predict(req);
        if (user.getRole() == Role.PATIENT) {
            patientRepository
                    .findByUserId(user.getId())
                    .ifPresent(
                            p ->
                                    patientService.saveAiSnapshot(
                                            p.getId(),
                                            out.getDisease(),
                                            out.getRemedy(),
                                            out.getYoga()));
        }
        return out;
    }
}
