package formula.bollo.service;

import java.util.List;
import java.security.Principal;

import org.springframework.beans.factory.annotation.Value;
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
    public ResponseEntity<String> login(AccountDTO accountDTO) {
        List<Account> account = accountRepository.findByUsername(accountDTO.getUsername());
        boolean goodCredentials = !account.isEmpty() && accountDTO.getPassword() != null
                && passwordEncoder.matches(accountDTO.getPassword(), account.get(0).getPassword());

        if (!goodCredentials) {
            log.error("Las credenciales no son válidas - " + accountDTO.getUsername());
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
        if (accountDTO.getPassword() == null)
            return new ResponseEntity<>("Tienes que poner contraseña", HttpStatusCode.valueOf(500));

        List<Account> account = accountRepository.findByUsername(accountDTO.getUsername());

        if (!account.isEmpty()) {
            log.error("El nombre de usuario ya ha sido utilizado - " + accountDTO.getUsername());
            return new ResponseEntity<>("El nombre de usuario ya ha sido utilizado", HttpStatusCode.valueOf(500));
        }

        account = accountRepository.findByEmail(accountDTO.getEmail());

        if (!account.isEmpty()) {
            log.error("El correo ya ha sido utilizado - " + accountDTO.getUsername());
            return new ResponseEntity<>("El correo ya ha sido utilizado", HttpStatusCode.valueOf(500));
        }

        // El cliente no decide su id ni su rol: con un id ajeno sobrescribiría otra cuenta y con admin=1 se haría administrador.
        accountDTO.setId(null);
        accountDTO.setAdmin(0);

        Account savedAccount = accountRepository.save(this.accountImpl.accountDTOToAccount(accountDTO));
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
        String username = principal.getName();
        List<Account> account = accountRepository.findByUsername(username);

        if (account.isEmpty()) {
            log.error("No se ha podido encontrar el usuario - " + username);
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
    public ResponseEntity<String> recoverPassword(String email) {
        List<Account> account = accountRepository.findByEmail(email);

        if (account.isEmpty()) {
            log.warn("Recuperación de contraseña para un correo sin cuenta - " + email);
        } else {
            this.sendEmail(this.accountImpl.accountToAccountDTO(account.get(0)));
        }

        // Misma respuesta exista o no la cuenta, para no revelar qué correos están registrados.
        return new ResponseEntity<>("Si el correo está registrado, recibirás un mensaje con el enlace para recuperar la contraseña",
                HttpStatusCode.valueOf(200));
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
