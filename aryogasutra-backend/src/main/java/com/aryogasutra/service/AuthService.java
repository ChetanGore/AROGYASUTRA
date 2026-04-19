package com.aryogasutra.service;

import com.aryogasutra.dto.AuthResponse;
import com.aryogasutra.dto.LoginRequest;
import com.aryogasutra.dto.RegisterRequest;
import com.aryogasutra.entity.Doctor;
import com.aryogasutra.entity.OAuthProvider;
import com.aryogasutra.entity.Patient;
import com.aryogasutra.entity.Role;
import com.aryogasutra.entity.User;
import com.aryogasutra.repository.DoctorRepository;
import com.aryogasutra.repository.PatientRepository;
import com.aryogasutra.repository.UserRepository;
import com.aryogasutra.security.JwtService;
import com.aryogasutra.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Value("${aryogasutra.allow-admin-register:false}")
    private boolean allowAdminRegister;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        if (req.getRole() == Role.ADMIN && !allowAdminRegister) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin self-registration is disabled");
        }
        if (req.getRole() == Role.DOCTOR
                && (req.getSpecialization() == null || req.getSpecialization().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Specialization required for doctors");
        }

        User user =
                User.builder()
                        .email(email)
                        .password(passwordEncoder.encode(req.getPassword()))
                        .role(req.getRole())
                        .oauthProvider(OAuthProvider.LOCAL)
                        .build();
        user = userRepository.save(user);

        Long profileId = null;
        if (req.getRole() == Role.PATIENT) {
            Patient p =
                    Patient.builder()
                            .userId(user.getId())
                            .name(req.getName().trim())
                            .build();
            profileId = patientRepository.save(p).getId();
        } else if (req.getRole() == Role.DOCTOR) {
            Doctor d =
                    Doctor.builder()
                            .userId(user.getId())
                            .name(req.getName().trim())
                            .specialization(req.getSpecialization().trim())
                            .latitude(req.getLatitude())
                            .longitude(req.getLongitude())
                            .build();
            profileId = doctorRepository.save(d).getId();
        }

        String token = jwtService.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .role(user.getRole())
                .userId(user.getId())
                .email(user.getEmail())
                .profileId(profileId)
                .message("Registered successfully")
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        String email = req.getEmail().trim().toLowerCase();
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, req.getPassword()));

        User user =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        Long profileId = resolveProfileId(user);

        String token = jwtService.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .role(user.getRole())
                .userId(user.getId())
                .email(user.getEmail())
                .profileId(profileId)
                .message("Login successful")
                .build();
    }

    private Long resolveProfileId(User user) {
        if (user.getRole() == Role.PATIENT) {
            return patientRepository.findByUserId(user.getId()).map(Patient::getId).orElse(null);
        }
        if (user.getRole() == Role.DOCTOR) {
            return doctorRepository.findByUserId(user.getId()).map(Doctor::getId).orElse(null);
        }
        return null;
    }

    public UserPrincipal loadPrincipal(String email) {
        User u =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        return UserPrincipal.fromEntity(u);
    }
}
