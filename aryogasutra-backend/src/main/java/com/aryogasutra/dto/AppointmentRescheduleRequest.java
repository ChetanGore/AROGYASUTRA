package com.aryogasutra.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AppointmentRescheduleRequest {
    @NotNull private LocalDateTime appointmentDate;
}
