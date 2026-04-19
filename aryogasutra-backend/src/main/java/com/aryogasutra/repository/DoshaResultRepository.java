package com.aryogasutra.repository;

import com.aryogasutra.entity.DoshaResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DoshaResultRepository extends JpaRepository<DoshaResult, Long> {
    Optional<DoshaResult> findTopByPatientIdOrderByCreatedAtDesc(Long patientId);
}
