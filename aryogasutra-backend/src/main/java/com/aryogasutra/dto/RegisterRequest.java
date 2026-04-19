package com.aryogasutra.dto;

import com.aryogasutra.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank
    @Email
    @Size(max = 120)
    private String email;

    @NotBlank
    @Size(min = 6, max = 100)
    private String password;

    @NotNull
    private Role role;

    @NotBlank
    @Size(max = 120)
    private String name;

    @Size(max = 120)
    private String specialization;

    /** Optional clinic coordinates for doctors */
    private Double latitude;

    private Double longitude;
}
