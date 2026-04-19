package com.aryogasutra.service;

import com.aryogasutra.dto.PredictRequest;
import com.aryogasutra.dto.PredictResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class MlProxyService {

    @Value("${aryogasutra.ml-api.base-url}")
    private String mlBaseUrl;

    public PredictResponse predict(PredictRequest req) {
        RestClient client = RestClient.builder().baseUrl(mlBaseUrl).build();
        Map<String, Object> body =
                Map.of(
                        "symptoms", req.getSymptoms(),
                        "age", req.getAge(),
                        "dosha", req.getDosha());

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> res =
                    client
                            .post()
                            .uri("/predict")
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(body)
                            .retrieve()
                            .body(Map.class);
            if (res == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY, "Empty response from ML service");
            }
            return mapResponse(res);
        } catch (RestClientResponseException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "ML service error: " + e.getStatusCode() + " " + e.getResponseBodyAsString());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "ML service unavailable: " + e.getMessage());
        }
    }

    private PredictResponse mapResponse(Map<String, Object> res) {
        String disease = firstString(res, "disease", "predicted_disease");
        String remedy = firstString(res, "remedy", "ayurvedic_remedy");
        String yoga = firstString(res, "yoga");
        Double conf = numberVal(res, "confidence");
        return PredictResponse.builder()
                .disease(disease)
                .remedy(remedy)
                .yoga(yoga)
                .confidence(conf)
                .build();
    }

    private static String firstString(Map<String, Object> m, String... keys) {
        for (String k : keys) {
            Object v = m.get(k);
            if (v != null && !String.valueOf(v).isBlank()) {
                return String.valueOf(v);
            }
        }
        return "";
    }

    private static Double numberVal(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v instanceof Number n) return n.doubleValue();
        if (v instanceof String s) {
            try {
                return Double.parseDouble(s);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
