package com.aryogasutra.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "patients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(length = 120)
    private String name;

    private Integer age;

    @Column(length = 20)
    private String gender;

    @Column(length = 2000)
    private String symptoms;

    @Column(length = 255)
    private String disease;

    @Column(length = 20)
    private String dosha;

    @Column(name = "medical_history", columnDefinition = "TEXT")
    private String medicalHistory;

    /** Server path to last uploaded report (optional). */
    @Column(name = "report_file_path", length = 500)
    private String reportFilePath;

    @Column(name = "last_ai_disease", length = 255)
    private String lastAiDisease;

    @Column(name = "last_ai_remedy", columnDefinition = "TEXT")
    private String lastAiRemedy;

    @Column(name = "last_ai_yoga", columnDefinition = "TEXT")
    private String lastAiYoga;

    @Column(name = "last_ai_at")
    private Instant lastAiAt;
}
