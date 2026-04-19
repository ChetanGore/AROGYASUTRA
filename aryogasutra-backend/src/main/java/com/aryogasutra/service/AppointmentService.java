package com.aryogasutra.service;

import com.aryogasutra.dto.AppointmentDto;
import com.aryogasutra.dto.AppointmentRequest;
import com.aryogasutra.dto.AppointmentRescheduleRequest;
import com.aryogasutra.entity.Appointment;
import com.aryogasutra.entity.AppointmentStatus;
import com.aryogasutra.entity.Doctor;
import com.aryogasutra.entity.Patient;
import com.aryogasutra.entity.Role;
import com.aryogasutra.repository.AppointmentRepository;
import com.aryogasutra.repository.DoctorRepository;
import com.aryogasutra.repository.PatientRepository;
import com.aryogasutra.repository.UserRepository;
import com.aryogasutra.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public AppointmentDto book(AppointmentRequest req, UserPrincipal user) {
        if (user.getRole() != Role.PATIENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only patients can book");
        }
        Patient patient =
                patientRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Doctor doctor =
                doctorRepository
                        .findById(req.getDoctorId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        Appointment a =
                Appointment.builder()
                        .patient(patient)
                        .doctor(doctor)
                        .appointmentDate(req.getAppointmentDate())
                        .status(AppointmentStatus.BOOKED)
                        .notes(req.getNotes())
                        .build();
        a = appointmentRepository.save(a);

        // Send notifications
        String patientEmail = userRepository.findById(patient.getUserId())
                .map(u -> u.getEmail()).orElse(null);
        String doctorEmail = userRepository.findById(doctor.getUserId())
                .map(u -> u.getEmail()).orElse(null);
        if (patientEmail != null && doctorEmail != null) {
            notificationService.sendAppointmentBooked(a, patientEmail, doctorEmail);
        }

        return toDto(a);
    }

    @Transactional
    public AppointmentDto reschedule(Long appointmentId, AppointmentRescheduleRequest req, UserPrincipal user) {
        Appointment a = loadOwnedAppointment(appointmentId, user);
        if (a.getStatus() == AppointmentStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment is cancelled");
        }
        a.setAppointmentDate(req.getAppointmentDate());
        a.setStatus(AppointmentStatus.RESCHEDULED);
        a = appointmentRepository.save(a);

        String patientEmail = userRepository.findById(a.getPatient().getUserId())
                .map(u -> u.getEmail()).orElse(null);
        String doctorEmail = userRepository.findById(a.getDoctor().getUserId())
                .map(u -> u.getEmail()).orElse(null);
        if (patientEmail != null && doctorEmail != null) {
            notificationService.sendAppointmentRescheduled(a, patientEmail, doctorEmail);
        }

        return toDto(a);
    }

    @Transactional
    public AppointmentDto cancel(Long appointmentId, UserPrincipal user) {
        Appointment a = loadOwnedAppointment(appointmentId, user);
        a.setStatus(AppointmentStatus.CANCELLED);
        a = appointmentRepository.save(a);

        String patientEmail = userRepository.findById(a.getPatient().getUserId())
                .map(u -> u.getEmail()).orElse(null);
        String doctorEmail = userRepository.findById(a.getDoctor().getUserId())
                .map(u -> u.getEmail()).orElse(null);
        if (patientEmail != null && doctorEmail != null) {
            notificationService.sendAppointmentCancelled(a, patientEmail, doctorEmail);
        }

        return toDto(a);
    }

    @Transactional
    public AppointmentDto updateTreatmentNotes(Long appointmentId, String preProcedureNotes,
            String postProcedureNotes, Boolean treatmentActive, UserPrincipal user) {
        Appointment a = loadOwnedAppointment(appointmentId, user);
        if (preProcedureNotes != null) a.setPreProcedureNotes(preProcedureNotes);
        if (postProcedureNotes != null) a.setPostProcedureNotes(postProcedureNotes);
        if (treatmentActive != null) a.setTreatmentActive(treatmentActive);
        a = appointmentRepository.save(a);

        // Send reminder to patient when treatment notes are updated
        if (Boolean.TRUE.equals(treatmentActive)) {
            String patientEmail = userRepository.findById(a.getPatient().getUserId())
                    .map(u -> u.getEmail()).orElse(null);
            if (patientEmail != null) {
                notificationService.sendTreatmentReminder(a, patientEmail);
            }
        }

        return toDto(a);
    }

    private Appointment loadOwnedAppointment(Long id, UserPrincipal user) {
        Appointment a =
                appointmentRepository
                        .findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (user.getRole() == Role.PATIENT) {
            Patient p =
                    patientRepository
                            .findByUserId(user.getId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            if (!a.getPatient().getId().equals(p.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            }
        } else if (user.getRole() == Role.DOCTOR) {
            Doctor d =
                    doctorRepository
                            .findByUserId(user.getId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            if (!a.getDoctor().getId().equals(d.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            }
        } else if (user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return a;
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> listForCurrentUser(UserPrincipal user) {
        if (user.getRole() == Role.PATIENT) {
            Patient p =
                    patientRepository
                            .findByUserId(user.getId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            return appointmentRepository.findByPatientIdWithDetails(p.getId()).stream()
                    .map(this::toDto)
                    .toList();
        }
        if (user.getRole() == Role.DOCTOR) {
            Doctor d =
                    doctorRepository
                            .findByUserId(user.getId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            return appointmentRepository.findByDoctorIdWithDetails(d.getId()).stream()
                    .map(this::toDto)
                    .toList();
        }
        if (user.getRole() == Role.ADMIN) {
            return appointmentRepository.findAllWithDetails().stream().map(this::toDto).toList();
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    private AppointmentDto toDto(Appointment a) {
        return AppointmentDto.builder()
                .id(a.getId())
                .patientId(a.getPatient().getId())
                .patientName(a.getPatient().getName())
                .doctorId(a.getDoctor().getId())
                .doctorName(a.getDoctor().getName())
                .appointmentDate(a.getAppointmentDate())
                .status(a.getStatus())
                .notes(a.getNotes())
                .preProcedureNotes(a.getPreProcedureNotes())
                .postProcedureNotes(a.getPostProcedureNotes())
                .treatmentActive(a.getTreatmentActive())
                .build();
    }
}
