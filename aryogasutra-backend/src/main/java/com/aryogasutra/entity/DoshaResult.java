package com.aryogasutra.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "dosha_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoshaResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "vata_score", nullable = false)
    private int vataScore;

    @Column(name = "pitta_score", nullable = false)
    private int pittaScore;

    @Column(name = "kapha_score", nullable = false)
    private int kaphaScore;

    @Column(name = "dominant_dosha", nullable = false, length = 20)
    private String dominantDosha;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
