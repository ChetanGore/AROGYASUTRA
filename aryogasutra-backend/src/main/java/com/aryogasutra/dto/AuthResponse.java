package com.aryogasutra.dto;

import com.aryogasutra.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private Role role;
    private Long userId;
    private String email;
    private Long profileId;
    private String message;
}
