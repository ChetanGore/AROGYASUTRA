package com.aryogasutra.controller;

import com.aryogasutra.dto.AppointmentDto;
import com.aryogasutra.dto.AppointmentRequest;
import com.aryogasutra.dto.AppointmentRescheduleRequest;
import com.aryogasutra.service.AppointmentService;
import com.aryogasutra.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PostMapping
    public AppointmentDto book(@Valid @RequestBody AppointmentRequest request) {
        return appointmentService.book(request, SecurityUtils.currentUser());
    }

    @GetMapping
    public List<AppointmentDto> listMine() {
        return appointmentService.listForCurrentUser(SecurityUtils.currentUser());
    }

    @PutMapping("/{id}/reschedule")
    public AppointmentDto reschedule(
            @PathVariable Long id, @Valid @RequestBody AppointmentRescheduleRequest request) {
        return appointmentService.reschedule(id, request, SecurityUtils.currentUser());
    }

    @PutMapping("/{id}/cancel")
    public AppointmentDto cancel(@PathVariable Long id) {
        return appointmentService.cancel(id, SecurityUtils.currentUser());
    }

    @PutMapping("/{id}/treatment-notes")
    public AppointmentDto updateTreatmentNotes(
            @PathVariable Long id, @RequestBody TreatmentNotesRequest request) {
        return appointmentService.updateTreatmentNotes(
                id, request.getPreProcedureNotes(), request.getPostProcedureNotes(),
                request.getTreatmentActive(), SecurityUtils.currentUser());
    }

    @Data
    public static class TreatmentNotesRequest {
        private String preProcedureNotes;
        private String postProcedureNotes;
        private Boolean treatmentActive;
    }
}
