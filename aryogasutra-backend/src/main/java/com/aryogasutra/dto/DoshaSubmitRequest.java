package com.aryogasutra.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class DoshaSubmitRequest {
    @NotEmpty @Valid private List<DoshaAnswerDto> answers;
}
