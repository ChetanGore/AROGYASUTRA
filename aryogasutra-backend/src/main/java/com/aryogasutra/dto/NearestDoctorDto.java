package com.aryogasutra.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearestDoctorDto {
    private Long id;
    private String name;
    private String specialization;
    private Double latitude;
    private Double longitude;
    /** Great-circle distance in kilometres */
    private double distanceKm;
}
