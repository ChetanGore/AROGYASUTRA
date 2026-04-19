package com.aryogasutra.service;

import com.aryogasutra.dto.DoctorDto;
import com.aryogasutra.dto.DoctorProfileUpdateRequest;
import com.aryogasutra.dto.NearestDoctorDto;
import com.aryogasutra.dto.NearestDoctorsRequest;
import com.aryogasutra.entity.Doctor;
import com.aryogasutra.entity.Role;
import com.aryogasutra.repository.DoctorRepository;
import com.aryogasutra.security.UserPrincipal;
import com.aryogasutra.util.GeoUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;

    @Transactional(readOnly = true)
    public List<DoctorDto> listAll() {
        return doctorRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<NearestDoctorDto> nearest(NearestDoctorsRequest req) {
        return doctorRepository.findAll().stream()
                .filter(d -> d.getLatitude() != null && d.getLongitude() != null)
                .map(
                        d ->
                                NearestDoctorDto.builder()
                                        .id(d.getId())
                                        .name(d.getName())
                                        .specialization(d.getSpecialization())
                                        .latitude(d.getLatitude())
                                        .longitude(d.getLongitude())
                                        .distanceKm(
                                                GeoUtils.distanceKm(
                                                        req.getLatitude(),
                                                        req.getLongitude(),
                                                        d.getLatitude(),
                                                        d.getLongitude()))
                                        .build())
                .sorted(Comparator.comparingDouble(NearestDoctorDto::getDistanceKm))
                .limit(req.getLimit())
                .toList();
    }

    @Transactional
    public DoctorDto updateMyProfile(DoctorProfileUpdateRequest req, UserPrincipal user) {
        if (user.getRole() != Role.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        Doctor d =
                doctorRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (req.getName() != null) d.setName(req.getName());
        if (req.getSpecialization() != null) d.setSpecialization(req.getSpecialization());
        if (req.getLatitude() != null) d.setLatitude(req.getLatitude());
        if (req.getLongitude() != null) d.setLongitude(req.getLongitude());
        return toDto(doctorRepository.save(d));
    }

    private DoctorDto toDto(Doctor d) {
        return DoctorDto.builder()
                .id(d.getId())
                .name(d.getName())
                .specialization(d.getSpecialization())
                .latitude(d.getLatitude())
                .longitude(d.getLongitude())
                .build();
    }
}
