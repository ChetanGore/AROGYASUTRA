package com.aryogasutra.service;

import com.aryogasutra.entity.Appointment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Slf4j
@Service
public class NotificationService {

    // Optional — won't fail startup if mail is not configured
    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${aryogasutra.notifications.enabled:false}")
    private boolean enabled;

    @Value("${aryogasutra.notifications.from-email:noreply.aryogasutra@gmail.com}")
    private String fromEmail;

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    public void sendAppointmentBooked(Appointment appt, String patientEmail, String doctorEmail) {
        if (!enabled || mailSender == null) {
            log.info("[Notification DISABLED] Appointment booked: patient={} doctor={} date={}",
                    patientEmail, doctorEmail, appt.getAppointmentDate());
            return;
        }
        String dateStr = appt.getAppointmentDate().format(FMT);

        sendEmail(patientEmail,
                "✅ Appointment Confirmed — AryogaSutra",
                String.format("""
                        Dear %s,

                        Your appointment has been confirmed!

                        Doctor: Dr. %s
                        Date & Time: %s
                        Status: BOOKED

                        Please arrive 10 minutes early.

                        Warm regards,
                        AryogaSutra Team
                        """,
                        appt.getPatient().getName(),
                        appt.getDoctor().getName(),
                        dateStr));

        sendEmail(doctorEmail,
                "📅 New Appointment — AryogaSutra",
                String.format("""
                        Dear Dr. %s,

                        A new appointment has been scheduled.

                        Patient: %s
                        Date & Time: %s

                        Please log in to AryogaSutra to view details.

                        AryogaSutra Team
                        """,
                        appt.getDoctor().getName(),
                        appt.getPatient().getName(),
                        dateStr));
    }

    public void sendAppointmentRescheduled(Appointment appt, String patientEmail, String doctorEmail) {
        if (!enabled || mailSender == null) {
            log.info("[Notification DISABLED] Appointment rescheduled: id={}", appt.getId());
            return;
        }
        String dateStr = appt.getAppointmentDate().format(FMT);
        String subject = "🔄 Appointment Rescheduled — AryogaSutra";

        sendEmail(patientEmail, subject,
                String.format("Your appointment with Dr. %s has been rescheduled to %s.",
                        appt.getDoctor().getName(), dateStr));

        sendEmail(doctorEmail, subject,
                String.format("Appointment with patient %s has been rescheduled to %s.",
                        appt.getPatient().getName(), dateStr));
    }

    public void sendAppointmentCancelled(Appointment appt, String patientEmail, String doctorEmail) {
        if (!enabled || mailSender == null) {
            log.info("[Notification DISABLED] Appointment cancelled: id={}", appt.getId());
            return;
        }
        String subject = "❌ Appointment Cancelled — AryogaSutra";

        sendEmail(patientEmail, subject,
                String.format("Your appointment with Dr. %s has been cancelled.",
                        appt.getDoctor().getName()));

        sendEmail(doctorEmail, subject,
                String.format("Appointment with patient %s has been cancelled.",
                        appt.getPatient().getName()));
    }

    public void sendTreatmentReminder(Appointment appt, String patientEmail) {
        if (!enabled || mailSender == null) {
            log.info("[Notification DISABLED] Treatment reminder: id={}", appt.getId());
            return;
        }
        StringBuilder body = new StringBuilder();
        body.append(String.format("Dear %s,\n\n", appt.getPatient().getName()));
        body.append("This is a reminder about your ongoing treatment with Dr. ")
                .append(appt.getDoctor().getName()).append(".\n\n");

        if (appt.getPreProcedureNotes() != null && !appt.getPreProcedureNotes().isBlank()) {
            body.append("📋 PRE-PROCEDURE INSTRUCTIONS:\n")
                    .append(appt.getPreProcedureNotes()).append("\n\n");
        }
        if (appt.getPostProcedureNotes() != null && !appt.getPostProcedureNotes().isBlank()) {
            body.append("📋 POST-PROCEDURE INSTRUCTIONS:\n")
                    .append(appt.getPostProcedureNotes()).append("\n\n");
        }
        body.append("Follow these instructions carefully for best results.\n\n");
        body.append("AryogaSutra Team");

        sendEmail(patientEmail, "🌿 Treatment Reminder — AryogaSutra", body.toString());
    }

    private void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromEmail);
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            mailSender.send(msg);
            log.info("Email sent to {}: {}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
