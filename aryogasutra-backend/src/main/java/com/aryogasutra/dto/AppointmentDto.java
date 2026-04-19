package com.aryogasutra.dto;

import com.aryogasutra.entity.AppointmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentDto {
    private Long id;
    private Long patientId;
    private String patientName;
    private Long doctorId;
    private String doctorName;
    private LocalDateTime appointmentDate;
    private AppointmentStatus status;
    private String notes;
    private String preProcedureNotes;
    private String postProcedureNotes;
    private Boolean treatmentActive;
}
