package com.aryogasutra.controller;

import com.aryogasutra.dto.DoctorDto;
import com.aryogasutra.dto.DoctorProfileUpdateRequest;
import com.aryogasutra.service.DoctorService;
import com.aryogasutra.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;

    @GetMapping
    public List<DoctorDto> list() {
        return doctorService.listAll();
    }

    @PutMapping("/me")
    public DoctorDto updateMe(@Valid @RequestBody DoctorProfileUpdateRequest request) {
        return doctorService.updateMyProfile(request, SecurityUtils.currentUser());
    }
}
