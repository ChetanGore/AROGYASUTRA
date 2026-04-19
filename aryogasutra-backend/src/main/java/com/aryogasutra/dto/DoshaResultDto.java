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
public class DoshaResultDto {
    private Long id;
    private Long patientId;
    private int vataScore;
    private int pittaScore;
    private int kaphaScore;
    private String dominantDosha;
    private Instant createdAt;
}
