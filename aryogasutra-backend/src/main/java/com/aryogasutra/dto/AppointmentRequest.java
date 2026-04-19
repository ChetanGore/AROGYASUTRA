package com.aryogasutra.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AppointmentRequest {

    @NotNull private Long doctorId;

    @NotNull private LocalDateTime appointmentDate;

    private String notes;
}
