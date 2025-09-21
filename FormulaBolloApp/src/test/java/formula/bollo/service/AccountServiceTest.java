package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import formula.bollo.config.JwtConfig;
import formula.bollo.entity.Account;
import formula.bollo.impl.AccountImpl;
import formula.bollo.model.AccountDTO;
import formula.bollo.repository.AccountRepository;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @InjectMocks
    private AccountService accountService;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountImpl accountImpl;

    @Mock
    private JwtConfig jwtConfig;

    @Mock
    private EmailService emailService;

    AccountDTO accountDTO;
    Account account;
    BCryptPasswordEncoder realEncoder = new BCryptPasswordEncoder();

    @BeforeEach
    void beforeAll() {
        accountDTO = new AccountDTO();
        account = new Account();
    }

    @Test
    void loginBadCredentials() {
        accountDTO = new AccountDTO(1L, "Avantifer", "123", 1, "email@mail.com");
        account = new Account(1L, "Avantifer", "111", 1, "email@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Arrays.asList(account));

        ResponseEntity<String> response = accountService.login(accountDTO);

        assertEquals("Las credenciales no son válidas", response.getBody());
    }

    @Test
    void loginGoodCredentials() {
        accountDTO = new AccountDTO(1L, "Avantifer", "123", 1, "email@mail.com");
        account = new Account(1L, "Avantifer", realEncoder.encode("123"), 1, "email@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Arrays.asList(account));

        ResponseEntity<String> response = accountService.login(accountDTO);

        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void registerNoPassword() {
        ResponseEntity<String> response = accountService.register(accountDTO);

        assertEquals("Tienes que poner contraseña", response.getBody());
    }

    @Test
    void registerUsernameExists() {
        accountDTO = new AccountDTO(1L, "Avantifer", "123", 1, "email@mail.com");
        account = new Account(1L, "Avantifer", "123", 1, "email@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Arrays.asList(account));

        ResponseEntity<String> response = accountService.register(accountDTO);

        assertEquals("El nombre de usuario ya ha sido utilizado", response.getBody());
    }

    @Test
    void registerEmailExists() {
        accountDTO = new AccountDTO(1L, "Avantifer", "123", 1, "email@mail.com");
        account = new Account(2L, "Bubapu", "123", 1, "email@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Collections.emptyList());
        when(accountRepository.findByEmail(anyString())).thenReturn(Arrays.asList(account));

        ResponseEntity<String> response = accountService.register(accountDTO);

        assertEquals("El correo ya ha sido utilizado", response.getBody());
    }

    @Test
    void registerGood() {
        accountDTO = new AccountDTO(1L, "Avantifer", "123", 1, "email@mail.com");
        account = new Account(2L, "Bubapu", "123", 1, "email2@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Collections.emptyList());
        when(accountRepository.findByEmail(anyString())).thenReturn(Collections.emptyList());

        ResponseEntity<String> response = accountService.register(accountDTO);

        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void changePasswordUserNotFound() {
        when(accountRepository.findByUsername(anyString())).thenReturn(Arrays.asList());

        ResponseEntity<String> response = accountService.changePassword("Avantifer", "123");

        assertEquals("No se ha podido encontrar el usuario", response.getBody());
    }

    @Test
    void changePasswordGood() {
        account = new Account(2L, "Bubapu", "123", 1, "email2@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Arrays.asList(account));

        ResponseEntity<String> response = accountService.changePassword("Avantifer", "123");

        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void recoverPasswordUserNotFound() {
        when(accountRepository.findByEmail(anyString())).thenReturn(Arrays.asList());

        ResponseEntity<String> response = accountService.recoverPassword("email@mail");

        assertEquals("El usuario no existe", response.getBody());
    }

    @Test
    void recoverPasswordGood() {
        accountDTO = new AccountDTO(1L, "Avantifer", "123", 1, "email@mail.com");
        account = new Account(1L, "Avantifer", "123", 1, "email@mail.com");

        when(accountRepository.findByEmail(anyString())).thenReturn(Arrays.asList(account));
        when(accountImpl.accountToAccountDTO(any())).thenReturn(accountDTO);

        ResponseEntity<String> response = accountService.recoverPassword("email@mail");

        assertEquals(200, response.getStatusCode().value());
    }
}
