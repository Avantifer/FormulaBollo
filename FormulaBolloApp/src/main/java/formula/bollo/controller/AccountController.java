package formula.bollo.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.impl.AccountImpl;
import formula.bollo.model.AccountDTO;
import formula.bollo.repository.AccountRepository;
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

    private AccountRepository accountRepository;
    private AccountImpl accountImpl;
    private AccountService accountService;

    public AccountController(
            AccountRepository accountRepository,
            AccountImpl accountImpl,
            AccountService accountService) {
        this.accountRepository = accountRepository;
        this.accountImpl = accountImpl;
        this.accountService = accountService;
    }

    @Operation(summary = "Login account", tags = Constants.TAG_ACCOUNT)
    @PostMapping(path = "/login", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> login(@RequestBody AccountDTO accountDTO) {
        log.info("Va a hacer login de " + accountDTO.getUsername());
        return this.accountService.login(accountDTO);
    }

    @Operation(summary = "Register account", tags = Constants.TAG_ACCOUNT)
    @PostMapping(path = "/register", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> register(@RequestBody AccountDTO accountDTO) {
        log.info("Va a hacer el registro de " + accountDTO.getUsername());
        return this.accountService.register(accountDTO);
    }

    @Operation(summary = "Change Password", tags = Constants.TAG_ACCOUNT)
    @PostMapping(path = "/changePassword", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> changePassword(@RequestParam String username, @RequestParam String password) {
        log.info("Se va a cambiar la contraseña de " + username);
        return this.accountService.changePassword(username, password);
    }

    @Operation(summary = "Recover Password", tags = Constants.TAG_ACCOUNT)
    @PostMapping(path = "/recoverPassword", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> recoverPassword(@RequestParam String email) {
        log.info("se va a recuperar la contraseña de " + email);
        return this.accountService.recoverPassword(email);
    }

    @Operation(summary = "Get account by id", tags = Constants.TAG_ACCOUNT)
    @GetMapping(path = "/id", produces = MediaType.APPLICATION_JSON_VALUE)
    public AccountDTO getUserById(@RequestParam Integer id) {
        log.info("Se va a coge el usuario del id " + id);
        return this.accountImpl.accountToAccountDTO(accountRepository.findById((long) id).orElse(null));
    }
}
