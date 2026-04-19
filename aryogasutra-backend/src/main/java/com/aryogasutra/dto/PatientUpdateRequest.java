package com.aryogasutra.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PatientUpdateRequest {

    @Size(max = 120)
    private String name;

    private Integer age;

    @Size(max = 20)
    private String gender;

    @Size(max = 2000)
    private String symptoms;

    @Size(max = 255)
    private String disease;

    @Size(max = 20)
    private String dosha;

    @Size(max = 4000)
    private String medicalHistory;
}
