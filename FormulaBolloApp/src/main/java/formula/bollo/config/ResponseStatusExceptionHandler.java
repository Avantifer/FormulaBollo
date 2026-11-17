package formula.bollo.config;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ResponseStatusExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<String> handle(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .contentType(MediaType.TEXT_PLAIN)
                .body(exception.getReason() == null ? "" : exception.getReason());
    }
}
