package com.aryogasutra.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientDto {
    private Long id;
    private Long userId;
    private String name;
    private Integer age;
    private String gender;
    private String symptoms;
    private String disease;
    private String dosha;
    private String medicalHistory;
    private String reportFilePath;
    private String lastAiDisease;
    private String lastAiRemedy;
    private String lastAiYoga;
    private Instant lastAiAt;
}
