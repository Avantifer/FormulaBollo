package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

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

        ResponseEntity<String> response = accountService.login(accountDTO, "192.0.2.1");

        assertEquals("Las credenciales no son válidas", response.getBody());
        assertEquals(401, response.getStatusCode().value());
    }

    @Test
    void loginUnknownUserIsUnauthorized() {
        accountDTO = new AccountDTO(null, "NoExiste", "123", 0, null);

        when(accountRepository.findByUsername(anyString())).thenReturn(Collections.emptyList());

        ResponseEntity<String> response = accountService.login(accountDTO, "192.0.2.1");

        assertEquals(401, response.getStatusCode().value());
    }

    @Test
    void existingAccountCanStillLoginWithAThreeCharacterPassword() {
        accountDTO = new AccountDTO(1L, "Avantifer", "123", 1, "email@mail.com");
        account = new Account(1L, "Avantifer", realEncoder.encode("123"), 1, "email@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Arrays.asList(account));

        ResponseEntity<String> response = accountService.login(accountDTO, "192.0.2.1");

        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void registerNoPassword() {
        ResponseEntity<String> response = accountService.register(accountDTO);

        assertEquals("La contraseña debe tener al menos 8 caracteres", response.getBody());
        assertEquals(400, response.getStatusCode().value());
    }

    @Test
    void registerUsernameExists() {
        accountDTO = new AccountDTO(1L, "Avantifer", "12345678", 1, "email@mail.com");
        account = new Account(1L, "Avantifer", "123", 1, "email@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Arrays.asList(account));

        ResponseEntity<String> response = accountService.register(accountDTO);

        assertEquals("El nombre de usuario ya ha sido utilizado", response.getBody());
        assertEquals(409, response.getStatusCode().value());
    }

    @Test
    void registerEmailExists() {
        accountDTO = new AccountDTO(1L, "Avantifer", "12345678", 1, "email@mail.com");
        account = new Account(2L, "Bubapu", "123", 1, "email@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Collections.emptyList());
        when(accountRepository.findByEmail(anyString())).thenReturn(Arrays.asList(account));

        ResponseEntity<String> response = accountService.register(accountDTO);

        assertEquals("El correo ya ha sido utilizado", response.getBody());
        assertEquals(409, response.getStatusCode().value());
    }

    @Test
    void registerWithEightCharacterPasswordSucceeds() {
        accountDTO = new AccountDTO(1L, "Avantifer", "12345678", 1, "email@mail.com");
        account = new Account(2L, "Bubapu", "123", 1, "email2@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Collections.emptyList());
        when(accountRepository.findByEmail(anyString())).thenReturn(Collections.emptyList());

        ResponseEntity<String> response = accountService.register(accountDTO);

        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void registerIgnoresIdAndAdminSentByTheClient() {
        // Un id ajeno sobrescribiría otra cuenta y admin=1 daría permisos de administrador.
        accountDTO = new AccountDTO(35L, "Atacante", "12345678", 1, "atacante@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Collections.emptyList());
        when(accountRepository.findByEmail(anyString())).thenReturn(Collections.emptyList());

        accountService.register(accountDTO);

        assertNull(accountDTO.getId());
        assertEquals(0, accountDTO.getAdmin());
        verify(accountImpl).accountDTOToAccount(accountDTO);
    }

    @Test
    void registerTokenContainsPersistedUserId() {
        AccountDTO input = new AccountDTO(99L, "ana", "password", 1, "ana@example.com");
        Account pending = new Account(null, "ana", "hash", 0, "ana@example.com");
        Account persisted = new Account(42L, "ana", "hash", 0, "ana@example.com");
        AccountDTO persistedDTO = new AccountDTO(42L, "ana", "hash", 0, "ana@example.com");
        JwtConfig realJwt = new JwtConfig();
        ReflectionTestUtils.setField(realJwt, "secret", "0123456789012345678901234567890123456789012345678901234567890123");
        AccountService service = new AccountService(accountRepository, accountImpl, realJwt, emailService);
        when(accountImpl.accountDTOToAccount(input)).thenAnswer(invocation -> {
            assertNull(input.getId());
            assertEquals(0, input.getAdmin());
            return pending;
        });
        when(accountRepository.save(pending)).thenReturn(persisted);
        when(accountImpl.accountToAccountDTO(persisted)).thenReturn(persistedDTO);

        ResponseEntity<String> response = service.register(input);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(42L, realJwt.extractAllClaims(response.getBody()).get("userId", Long.class));
        assertEquals(0, realJwt.extractAllClaims(response.getBody()).get("admin", Integer.class));
    }

    @Test
    void changePasswordUserNotFound() {
        when(accountRepository.findByUsername(anyString())).thenReturn(Arrays.asList());

        ResponseEntity<String> response = accountService.changePassword(() -> "Avantifer", "12345678");

        assertEquals("No se ha podido encontrar el usuario", response.getBody());
    }

    @Test
    void changePasswordGood() {
        account = new Account(2L, "Bubapu", "123", 1, "email2@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Arrays.asList(account));

        ResponseEntity<String> response = accountService.changePassword(() -> "Avantifer", "12345678");

        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void recoverPasswordUserNotFound() {
        when(accountRepository.findByEmail(anyString())).thenReturn(Arrays.asList());

        ResponseEntity<String> response = accountService.recoverPassword("email@mail", "192.0.2.1");

        // No revela si el correo existe: misma respuesta, pero sin enviar nada.
        assertEquals(200, response.getStatusCode().value());
        verifyNoInteractions(emailService);
    }

    @Test
    void recoverPasswordGood() {
        accountDTO = new AccountDTO(1L, "Avantifer", "123", 1, "email@mail.com");
        account = new Account(1L, "Avantifer", "123", 1, "email@mail.com");

        when(accountRepository.findByEmail(anyString())).thenReturn(Arrays.asList(account));
        when(accountImpl.accountToAccountDTO(any())).thenReturn(accountDTO);

        ResponseEntity<String> response = accountService.recoverPassword("email@mail", "192.0.2.1");

        assertEquals(200, response.getStatusCode().value());
        // El enlace del correo caduca a los 30 minutos (no a los 30 días de una sesión).
        verify(jwtConfig).generateRecoveryToken(any());
    }

    @Test
    void recoverPasswordLinkUsesTheConfiguredFrontendUrl() {
        accountDTO = new AccountDTO(1L, "Avantifer", "123", 1, "email@mail.com");
        account = new Account(1L, "Avantifer", "123", 1, "email@mail.com");
        ReflectionTestUtils.setField(accountService, "frontendUrl", "http://localhost:4200");

        when(accountRepository.findByEmail(anyString())).thenReturn(Arrays.asList(account));
        when(accountImpl.accountToAccountDTO(any())).thenReturn(accountDTO);
        when(jwtConfig.generateRecoveryToken(any())).thenReturn("tok");

        accountService.recoverPassword("email@mail", "192.0.2.1");

        verify(emailService).sendSimpleMessage(eq("email@mail.com"), anyString(),
                contains("http://localhost:4200/fantasy/recoverPassword/tok"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t", "        ", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "ééééééééééééééééééééééééééééééééééééé"})
    void invalidPasswordIsRejectedByRegistrationAndChange(String password) {
        AccountDTO input = new AccountDTO(null, "ana", password, 0, "ana@example.com");
        assertEquals(400, accountService.register(input).getStatusCode().value());
        assertEquals(400, accountService.changePassword(() -> "ana", password).getStatusCode().value());
        verifyNoInteractions(accountRepository, accountImpl, jwtConfig);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "abcdefghijklmnopqrstuvwxyz"})
    void invalidUsernameIsRejectedBeforePersistence(String username) {
        assertEquals(400, accountService.register(new AccountDTO(null, username, "password", 0, "ana@example.com")).getStatusCode().value());
        verifyNoInteractions(accountRepository, accountImpl, jwtConfig);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "invalid", "ana@", "@example.com", "ana a@example.com", "ana..a@example.com", ".ana@example.com", "ana@-example.com"})
    void invalidEmailIsRejectedBeforePersistence(String email) {
        assertEquals(400, accountService.register(new AccountDTO(null, "ana", "password", 0, email)).getStatusCode().value());
        verifyNoInteractions(accountRepository, accountImpl, jwtConfig);
    }

    @Test
    void emailLongerThanEntityColumnIsRejected() {
        String email = "a".repeat(90) + "@example.com";
        assertEquals(400, accountService.register(new AccountDTO(null, "ana", "password", 0, email)).getStatusCode().value());
        verifyNoInteractions(accountRepository, accountImpl, jwtConfig);
    }

    @Test
    void entityLengthBoundariesAndSeventyTwoUtf8BytesAreAccepted() {
        String email = "a".repeat(64) + "@" + "b".repeat(31) + ".com";
        assertEquals(100, email.length());
        AccountDTO input = new AccountDTO(null, "a".repeat(25), "é".repeat(36), 0, email);
        assertEquals(200, accountService.register(input).getStatusCode().value());
        verify(accountRepository).save(any());
    }

    @Test
    void oneCharacterPasswordIsRejectedForRegistration() {
        assertEquals(400, accountService.register(new AccountDTO(null, "ana", "x", 0, "ana@example.com")).getStatusCode().value());
        verifyNoInteractions(accountRepository, accountImpl, jwtConfig);
    }

    @Test
    void threeCharacterPasswordIsRejectedForRegistration() {
        ResponseEntity<String> response = accountService.register(
                new AccountDTO(null, "ana", "abc", 0, "ana@example.com"));

        assertEquals(400, response.getStatusCode().value());
        assertEquals("La contraseña debe tener al menos 8 caracteres", response.getBody());
        verifyNoInteractions(accountRepository, accountImpl, jwtConfig);
    }

    @Test
    void sevenCharacterPasswordIsRejectedForChange() {
        ResponseEntity<String> response = accountService.changePassword(() -> "ana", "1234567");

        assertEquals(400, response.getStatusCode().value());
        assertEquals("La contraseña debe tener al menos 8 caracteres", response.getBody());
        verifyNoInteractions(accountRepository, accountImpl, jwtConfig);
    }

    @Test
    void concurrentUniqueConstraintViolationReturnsConflict() {
        Account pending = new Account();
        when(accountImpl.accountDTOToAccount(any())).thenReturn(pending);
        when(accountRepository.save(pending)).thenThrow(new DataIntegrityViolationException("duplicate"));
        assertEquals(409, accountService.register(new AccountDTO(null, "ana", "password", 0, "ana@example.com")).getStatusCode().value());
        verifyNoInteractions(jwtConfig);
    }

    @Test
    void recoveryNormalizesTheEmailBeforeLookingItUp() {
        assertEquals(200, accountService.recoverPassword(" ANA@EXAMPLE.COM ", "ip").getStatusCode().value());
        verify(accountRepository).findByEmail("ana@example.com");
    }

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void recoveryResponseAndLimitsAreUniformAndEmailIsNotLogged(CapturedOutput output) {
        AccountDTO found = new AccountDTO(1L, "private@example.com", "hash", 0, "private@example.com");
        Account entity = new Account(1L, "private@example.com", "hash", 0, "private@example.com");
        when(accountRepository.findByEmail("private@example.com")).thenReturn(Arrays.asList(entity));
        when(accountImpl.accountToAccountDTO(entity)).thenReturn(found);
        ResponseEntity<String> known = null;
        ResponseEntity<String> unknown = null;
        for (int i = 0; i < 3; i++) {
            known = accountService.recoverPassword("private@example.com", "ip");
            unknown = accountService.recoverPassword("missing@example.com", "ip");
            assertEquals(known.getStatusCode(), unknown.getStatusCode());
            assertEquals(known.getBody(), unknown.getBody());
        }
        known = accountService.recoverPassword("private@example.com", "ip");
        unknown = accountService.recoverPassword("missing@example.com", "ip");
        assertEquals(429, known.getStatusCode().value());
        assertEquals(known.getStatusCode(), unknown.getStatusCode());
        assertEquals(known.getBody(), unknown.getBody());
        assertFalse(output.getAll().contains("private@example.com"));
        assertFalse(output.getAll().contains("missing@example.com"));
    }
}
