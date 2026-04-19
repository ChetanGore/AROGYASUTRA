package com.aryogasutra.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Contract for SPA + PDF — matches ML API simplified JSON. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PredictResponse {
    private String disease;
    private String remedy;
    private String yoga;
    private Double confidence;
}
