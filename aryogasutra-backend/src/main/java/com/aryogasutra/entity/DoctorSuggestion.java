package com.aryogasutra.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Clinical / lifestyle suggestions from a doctor to a patient. */
@Entity
@Table(name = "doctor_suggestions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @Column(name = "suggestion_text", nullable = false, columnDefinition = "TEXT")
    private String suggestionText;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
