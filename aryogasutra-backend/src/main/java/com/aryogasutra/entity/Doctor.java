package com.aryogasutra.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "doctors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(length = 120)
    private String name;

    @Column(length = 120)
    private String specialization;

    /** WGS84 decimal degrees — used for nearest-doctor search */
    private Double latitude;

    private Double longitude;
}
