package com.aryogasutra.repository;

import com.aryogasutra.entity.DoctorSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DoctorSuggestionRepository extends JpaRepository<DoctorSuggestion, Long> {

    @Query("SELECT s FROM DoctorSuggestion s JOIN FETCH s.doctor JOIN FETCH s.patient WHERE s.patient.id = :patientId ORDER BY s.createdAt DESC")
    List<DoctorSuggestion> findByPatientIdWithDetails(@Param("patientId") Long patientId);
}
