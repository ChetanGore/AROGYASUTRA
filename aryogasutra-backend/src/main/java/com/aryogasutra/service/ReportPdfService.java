package com.aryogasutra.service;

import com.aryogasutra.entity.Patient;
import com.aryogasutra.entity.Role;
import com.aryogasutra.repository.DoshaResultRepository;
import com.aryogasutra.repository.DoctorSuggestionRepository;
import com.aryogasutra.repository.PatientRepository;
import com.aryogasutra.security.UserPrincipal;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;

@Service
@RequiredArgsConstructor
public class ReportPdfService {

    private final PatientRepository patientRepository;
    private final DoshaResultRepository doshaResultRepository;
    private final DoctorSuggestionRepository suggestionRepository;

    @Transactional(readOnly = true)
    public byte[] generate(Long patientId, UserPrincipal user) {
        Patient p =
                patientRepository
                        .findById(patientId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        authorizeReport(user, p);

        var dosha =
                doshaResultRepository.findTopByPatientIdOrderByCreatedAtDesc(patientId).orElse(null);
        var suggestions = suggestionRepository.findByPatientIdWithDetails(patientId);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);

            doc.add(
                    new Paragraph("AryogaSutra — Health Summary")
                            .setBold()
                            .setFontSize(18)
                            .setTextAlignment(TextAlignment.CENTER));
            doc.add(new Paragraph(" ").setFontSize(8));

            doc.add(new Paragraph("Patient: " + nullSafe(p.getName())).setBold());
            doc.add(new Paragraph("Age: " + (p.getAge() != null ? p.getAge() : "—")));
            doc.add(new Paragraph("Gender: " + nullSafe(p.getGender())));
            doc.add(new Paragraph("Symptoms: " + nullSafe(p.getSymptoms())));
            doc.add(new Paragraph("Condition: " + nullSafe(p.getDisease())));
            doc.add(new Paragraph("Dosha (profile): " + nullSafe(p.getDosha())));
            doc.add(new Paragraph("Medical history: " + nullSafe(p.getMedicalHistory())));
            doc.add(new Paragraph("Report file: " + nullSafe(p.getReportFilePath())));

            doc.add(new Paragraph(" ").setFontSize(10));
            doc.add(new Paragraph("Dosha questionnaire (latest)").setBold());
            if (dosha != null) {
                doc.add(
                        new Paragraph(
                                "Vata: "
                                        + dosha.getVataScore()
                                        + "  Pitta: "
                                        + dosha.getPittaScore()
                                        + "  Kapha: "
                                        + dosha.getKaphaScore()));
                doc.add(new Paragraph("Dominant: " + dosha.getDominantDosha()));
            } else {
                doc.add(new Paragraph("No questionnaire results stored."));
            }

            doc.add(new Paragraph(" ").setFontSize(10));
            doc.add(new Paragraph("AI wellness snapshot (informational only)").setBold());
            doc.add(new Paragraph("Predicted pattern: " + nullSafe(p.getLastAiDisease())));
            doc.add(new Paragraph("Remedy ideas: " + nullSafe(p.getLastAiRemedy())));
            doc.add(new Paragraph("Yoga ideas: " + nullSafe(p.getLastAiYoga())));

            doc.add(new Paragraph(" ").setFontSize(10));
            doc.add(new Paragraph("Doctor suggestions").setBold());
            if (suggestions.isEmpty()) {
                doc.add(new Paragraph("None recorded."));
            } else {
                suggestions.forEach(
                        s ->
                                doc.add(
                                        new Paragraph(
                                                "• ["
                                                        + s.getDoctor().getName()
                                                        + "] "
                                                        + s.getSuggestionText())));
            }

            doc.add(
                    new Paragraph(
                                    "\nDisclaimer: Educational / demo output — not a medical diagnosis.")
                            .setItalic()
                            .setFontSize(9));

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "PDF generation failed: " + e.getMessage());
        }
    }

    private void authorizeReport(UserPrincipal user, Patient p) {
        if (user.getRole() == Role.ADMIN) return;
        if (user.getRole() == Role.DOCTOR) return;
        if (user.getRole() == Role.PATIENT) {
            if (!p.getUserId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            }
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    private static String nullSafe(String s) {
        return s == null || s.isBlank() ? "—" : s;
    }
}
