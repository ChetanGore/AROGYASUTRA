package com.aryogasutra.repository;

import com.aryogasutra.entity.OAuthProvider;
import com.aryogasutra.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByOauthProviderAndOauthSubject(OAuthProvider provider, String oauthSubject);
}
