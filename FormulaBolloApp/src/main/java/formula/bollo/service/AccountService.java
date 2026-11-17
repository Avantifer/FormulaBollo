package formula.bollo.service;

import java.util.List;
import java.security.Principal;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import formula.bollo.config.JwtConfig;
import formula.bollo.entity.Account;
import formula.bollo.impl.AccountImpl;
import formula.bollo.model.AccountDTO;
import formula.bollo.repository.AccountRepository;
import formula.bollo.utils.Constants;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AccountService {
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private static final Pattern EMAIL = Pattern.compile("^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*$");
    private AccountAttemptLimiter attemptLimiter = new AccountAttemptLimiter(Duration.ofMinutes(15), 10, 30, 3, 20, System::nanoTime);

    @Autowired
    void configureAttemptLimits(@Value("${account.rate-limit.window:PT15M}") String window,
            @Value("${account.rate-limit.login-account:10}") int loginAccount,
            @Value("${account.rate-limit.login-ip:30}") int loginIp,
            @Value("${account.rate-limit.recovery-email:3}") int recoveryEmail,
            @Value("${account.rate-limit.recovery-ip:20}") int recoveryIp,
            @Value("${account.rate-limit.recovery-email-total:10}") int recoveryEmailTotal) {
        attemptLimiter = new AccountAttemptLimiter(Duration.parse(window), loginAccount, loginIp, recoveryEmail, recoveryIp,
                recoveryEmailTotal, System::nanoTime);
    }

    private AccountRepository accountRepository;

    private AccountImpl accountImpl;

    private JwtConfig jwtConfig;

    private EmailService emailService;

    // Dónde vive el frontend que recibe el enlace del correo; en desarrollo: frontend.url=http://localhost:4200/
    @Value("${frontend.url:" + Constants.PRODUCTION_FRONTEND + "}")
    private String frontendUrl = Constants.PRODUCTION_FRONTEND;

    public AccountService(AccountRepository accountRepository, AccountImpl accountImpl, JwtConfig jwtConfig,
            EmailService emailService) {
        this.accountRepository = accountRepository;
        this.accountImpl = accountImpl;
        this.jwtConfig = jwtConfig;
        this.emailService = emailService;
    }

    /**
     * Handles the login process for an account.
     *
     * @param accountDTO the AccountDTO containing the login credentials (username
     *                   and password)
     * @return ResponseEntity containing the JWT token if authentication is
     *         successful.
     */
    public ResponseEntity<String> login(AccountDTO accountDTO, String remoteAddress) {
        return attemptLimiter.login(accountDTO == null ? null : accountDTO.getUsername(), remoteAddress,
                () -> authenticate(accountDTO));
    }

    private ResponseEntity<String> authenticate(AccountDTO accountDTO) {
        if (accountDTO == null || accountDTO.getUsername() == null || !validPassword(accountDTO.getPassword())) {
            return ResponseEntity.status(401).body("Las credenciales no son válidas");
        }
        List<Account> account = accountRepository.findByUsername(accountDTO.getUsername());
        boolean goodCredentials = !account.isEmpty() && accountDTO.getPassword() != null
                && passwordEncoder.matches(accountDTO.getPassword(), account.get(0).getPassword());

        if (!goodCredentials) {
            log.warn("Intento de acceso con credenciales no validas");
            return new ResponseEntity<>("Las credenciales no son válidas", HttpStatusCode.valueOf(401));
        }

        AccountDTO adminDTO = this.accountImpl.accountToAccountDTO(account.get(0));
        String token = jwtConfig.generateToken(adminDTO);

        return new ResponseEntity<>(token, HttpStatusCode.valueOf(200));
    }

    /**
     * Handles the register process for an account.
     *
     * @param accountDTO the AccountDTO containing the register credentials
     *                   (username and password)
     * @return ResponseEntity containing the JWT token if authentication is
     *         successful.
     */
    public ResponseEntity<String> register(AccountDTO accountDTO) {
        if (accountDTO == null || !validPassword(accountDTO.getPassword()))
            return ResponseEntity.badRequest().body("Tienes que poner contraseña");
        if (accountDTO.getUsername() == null || accountDTO.getUsername().isBlank() || accountDTO.getUsername().length() > 25
                || accountDTO.getEmail() == null || accountDTO.getEmail().isBlank() || accountDTO.getEmail().length() > 100
                || !EMAIL.matcher(accountDTO.getEmail()).matches()) {
            return ResponseEntity.badRequest().body("El usuario o el correo no son validos");
        }

        List<Account> account = accountRepository.findByUsername(accountDTO.getUsername());

        if (!account.isEmpty()) {
            log.warn("El nombre de usuario ya ha sido utilizado");
            return new ResponseEntity<>("El nombre de usuario ya ha sido utilizado", HttpStatusCode.valueOf(409));
        }

        account = accountRepository.findByEmail(accountDTO.getEmail());

        if (!account.isEmpty()) {
            log.warn("El correo ya ha sido utilizado");
            return new ResponseEntity<>("El correo ya ha sido utilizado", HttpStatusCode.valueOf(409));
        }

        // El cliente no decide su id ni su rol: con un id ajeno sobrescribiría otra cuenta y con admin=1 se haría administrador.
        accountDTO.setId(null);
        accountDTO.setAdmin(0);

        Account savedAccount;
        try {
            savedAccount = accountRepository.save(this.accountImpl.accountDTOToAccount(accountDTO));
        } catch (DataIntegrityViolationException exception) {
            return ResponseEntity.status(409).body("El usuario o el correo ya han sido utilizados");
        }
        String token = jwtConfig.generateToken(this.accountImpl.accountToAccountDTO(savedAccount));

        return new ResponseEntity<>(token, HttpStatusCode.valueOf(200));
    }

    /**
     * Changes the password of an existing account.
     *
     * @param principal usuario autenticado cuya contraseña se cambia
     * @param password the new password to be encrypted and set for the account
     * @return ResponseEntity<String> a response entity with a success messageor
     *         failed.
     */
    public ResponseEntity<String> changePassword(Principal principal, String password) {
        if (!validPassword(password)) {
            return ResponseEntity.badRequest().body("La contraseña no es valida");
        }
        String username = principal.getName();
        List<Account> account = accountRepository.findByUsername(username);

        if (account.isEmpty()) {
            log.warn("No se ha podido encontrar el usuario");
            return new ResponseEntity<>("No se ha podido encontrar el usuario", HttpStatusCode.valueOf(500));
        }

        account.get(0).setPassword(passwordEncoder.encode(password));
        accountRepository.save(account.get(0));

        return new ResponseEntity<>("Se ha cambiado la contraseña correctamente", HttpStatusCode.valueOf(200));
    }

    /**
     * Recovers the password by sending an email with a recovery link to the user.
     *
     * @param email The email address associated with the account for password
     *              recovery.
     * @return ResponseEntity<String> with the status of the operation.
     */
    public ResponseEntity<String> recoverPassword(String email, String remoteAddress) {
        ResponseEntity<String> limited = attemptLimiter.recovery(email, remoteAddress);
        if (limited != null) {
            return limited;
        }
        email = AccountAttemptLimiter.normalize(email);
        List<Account> account = accountRepository.findByEmail(email);

        if (account.isEmpty()) {
            log.info("Solicitud de recuperacion de contraseña procesada");
        } else {
            this.sendEmail(this.accountImpl.accountToAccountDTO(account.get(0)));
        }

        // Misma respuesta exista o no la cuenta, para no revelar qué correos están registrados.
        return new ResponseEntity<>("Si el correo está registrado, recibirás un mensaje con el enlace para recuperar la contraseña",
                HttpStatusCode.valueOf(200));
    }

    private boolean validPassword(String password) {
        return password != null && !password.isBlank() && password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    /**
     * Sends an email with a password recovery link to the user.
     *
     * @param accountDTO The account details of the user requesting password
     *                   recovery.
     */
    private void sendEmail(AccountDTO accountDTO) {
        String token = this.jwtConfig.generateRecoveryToken(accountDTO);
        String base = this.frontendUrl.endsWith("/") ? this.frontendUrl : this.frontendUrl + "/";
        String link = base + "fantasy/recoverPassword/" + token;
        String message = """
                Para recuperar la contraseña, haz click en el siguiente enlace:
                %s
                """.formatted(link);

        this.emailService.sendSimpleMessage(accountDTO.getEmail(), "Contraseña olvidada", message);
    }
}
