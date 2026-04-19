package com.aryogasutra.controller;

import com.aryogasutra.dto.NearestDoctorDto;
import com.aryogasutra.dto.NearestDoctorsRequest;
import com.aryogasutra.service.DoctorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class NearestDoctorsController {

    private final DoctorService doctorService;

    @PostMapping("/nearest-doctors")
    public List<NearestDoctorDto> nearest(@Valid @RequestBody NearestDoctorsRequest request) {
        return doctorService.nearest(request);
    }
}
