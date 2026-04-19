package com.aryogasutra.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DoshaAnswerDto {
    @NotBlank private String questionId;

    /** Index into the question's options array */
    @NotNull
    @Min(0)
    private Integer optionIndex;
}
