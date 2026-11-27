package formula.bollo.controller;

import java.security.Principal;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.model.AccountDTO;
import formula.bollo.service.AccountService;
import formula.bollo.utils.Constants;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping(path = { Constants.ENDPOINT_ACCOUNT })
@Tag(name = Constants.TAG_ACCOUNT, description = Constants.TAG_ACCOUNT_SUMMARY)
public class AccountController {

    private AccountService accountService;

    public AccountController(
            AccountService accountService) {
        this.accountService = accountService;
    }

    @Operation(summary = "Login account", tags = Constants.TAG_ACCOUNT)
    @PostMapping(path = "/login", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> login(@RequestBody AccountDTO accountDTO, HttpServletRequest request) {
        log.info("Solicitud de login");
        return this.accountService.login(accountDTO, request.getRemoteAddr());
    }

    @Operation(summary = "Register account", tags = Constants.TAG_ACCOUNT)
    @PostMapping(path = "/register", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> register(@RequestBody AccountDTO accountDTO) {
        log.info("Solicitud de registro");
        return this.accountService.register(accountDTO);
    }

    @Operation(summary = "Change Password", tags = Constants.TAG_ACCOUNT)
    @PostMapping(path = "/changePassword", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> changePassword(@RequestBody PasswordChangeRequest request,
            Principal principal) {
        log.info("Solicitud de cambio de contraseña");
        return this.accountService.changePassword(principal, request.password());
    }

    public record PasswordChangeRequest(String password) {
        @Override
        public String toString() {
            return "PasswordChangeRequest[password=***]";
        }
    }

    @Operation(summary = "Recover Password", tags = Constants.TAG_ACCOUNT)
    @PostMapping(path = "/recoverPassword", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> recoverPassword(@RequestParam String email, HttpServletRequest request) {
        log.info("Solicitud de recuperacion de contraseña");
        return this.accountService.recoverPassword(email, request.getRemoteAddr());
    }
}
