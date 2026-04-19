package com.aryogasutra.security;

import com.aryogasutra.entity.OAuthProvider;
import com.aryogasutra.entity.Patient;
import com.aryogasutra.entity.Role;
import com.aryogasutra.entity.User;
import com.aryogasutra.repository.PatientRepository;
import com.aryogasutra.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * After Google/Facebook login, link or create a PATIENT account and redirect to the SPA with a JWT.
 */
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final JwtService jwtService;

    @Value("${aryogasutra.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Override
    @Transactional
    public void onAuthenticationSuccess(
            HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException {

        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauthUser = token.getPrincipal();
        String registrationId = token.getAuthorizedClientRegistrationId();

        OAuthProvider provider =
                "facebook".equalsIgnoreCase(registrationId)
                        ? OAuthProvider.FACEBOOK
                        : OAuthProvider.GOOGLE;

        String subject =
                oauthUser.getAttribute("sub") != null
                        ? String.valueOf(oauthUser.getAttribute("sub"))
                        : oauthUser.getName();

        String rawEmail = oauthUser.getAttribute("email");
        final String email =
                rawEmail == null || rawEmail.isBlank()
                        ? "user_" + subject + "@oauth." + registrationId + ".local"
                        : rawEmail.trim().toLowerCase();

        String displayName =
                oauthUser.getAttribute("name") != null
                        ? String.valueOf(oauthUser.getAttribute("name"))
                        : email;

        User user =
                userRepository
                        .findByOauthProviderAndOauthSubject(provider, subject)
                        .orElseGet(
                                () ->
                                        userRepository
                                                .findByEmail(email)
                                                .map(
                                                        existing -> {
                                                            existing.setOauthProvider(provider);
                                                            existing.setOauthSubject(subject);
                                                            return userRepository.save(existing);
                                                        })
                                                .orElseGet(
                                                        () -> {
                                                            User u =
                                                                    User.builder()
                                                                            .email(email)
                                                                            .password(null)
                                                                            .role(Role.PATIENT)
                                                                            .oauthProvider(provider)
                                                                            .oauthSubject(subject)
                                                                            .build();
                                                            u = userRepository.save(u);
                                                            patientRepository.save(
                                                                    Patient.builder()
                                                                            .userId(u.getId())
                                                                            .name(displayName)
                                                                            .build());
                                                            return u;
                                                        }));

        if (user.getRole() == Role.PATIENT
                && patientRepository.findByUserId(user.getId()).isEmpty()) {
            patientRepository.save(
                    Patient.builder().userId(user.getId()).name(displayName).build());
        }

        String jwt = jwtService.generateToken(user);
        String target =
                frontendUrl.replaceAll("/$", "")
                        + "/oauth/callback?token="
                        + URLEncoder.encode(jwt, StandardCharsets.UTF_8);
        getRedirectStrategy().sendRedirect(request, response, target);
    }
}
