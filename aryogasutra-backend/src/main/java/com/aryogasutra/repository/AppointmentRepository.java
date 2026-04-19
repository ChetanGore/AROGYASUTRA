package com.aryogasutra.repository;

import com.aryogasutra.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient JOIN FETCH a.doctor WHERE a.patient.id = :patientId ORDER BY a.appointmentDate DESC")
    List<Appointment> findByPatientIdWithDetails(@Param("patientId") Long patientId);

    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient JOIN FETCH a.doctor WHERE a.doctor.id = :doctorId ORDER BY a.appointmentDate DESC")
    List<Appointment> findByDoctorIdWithDetails(@Param("doctorId") Long doctorId);

    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient JOIN FETCH a.doctor ORDER BY a.appointmentDate DESC")
    List<Appointment> findAllWithDetails();
}
