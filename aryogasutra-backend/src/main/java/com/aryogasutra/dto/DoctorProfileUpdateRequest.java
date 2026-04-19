package com.aryogasutra.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DoctorProfileUpdateRequest {

    @Size(max = 120)
    private String name;

    @Size(max = 120)
    private String specialization;

    private Double latitude;

    private Double longitude;
}
