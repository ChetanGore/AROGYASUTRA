package com.aryogasutra.controller;

import com.aryogasutra.dto.AuthResponse;
import com.aryogasutra.dto.LoginRequest;
import com.aryogasutra.dto.RegisterRequest;
import com.aryogasutra.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /** Browser redirect entry points for the React app (opens provider login). */
    @GetMapping("/oauth/google")
    public void google(HttpServletResponse response) throws IOException {
        response.sendRedirect("/oauth2/authorization/google");
    }

    @GetMapping("/oauth/facebook")
    public void facebook(HttpServletResponse response) throws IOException {
        response.sendRedirect("/oauth2/authorization/facebook");
    }
}
