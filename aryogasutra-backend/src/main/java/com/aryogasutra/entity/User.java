package com.aryogasutra.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Login identity — unique email */
    @Column(nullable = false, unique = true, length = 120)
    private String email;

    /**
     * BCrypt hash for LOCAL users; null for pure OAuth accounts until password is set.
     */
    @Column(length = 120)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "oauth_provider", nullable = false, length = 20)
    @Builder.Default
    private OAuthProvider oauthProvider = OAuthProvider.LOCAL;

    /** Subject / id from Google, Facebook, etc. */
    @Column(name = "oauth_subject", length = 128)
    private String oauthSubject;
}
