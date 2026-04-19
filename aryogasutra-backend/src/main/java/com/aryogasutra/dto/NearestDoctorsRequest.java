package com.aryogasutra.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class NearestDoctorsRequest {

    @NotNull private Double latitude;

    @NotNull private Double longitude;

    @Min(1)
    @Max(10)
    private int limit = 3;
}
