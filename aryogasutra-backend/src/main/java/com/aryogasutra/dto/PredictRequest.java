package com.aryogasutra.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PredictRequest {

    @NotBlank private String symptoms;

    @NotNull
    @Min(0)
    @Max(120)
    private Integer age;

    @NotBlank private String dosha;
}
