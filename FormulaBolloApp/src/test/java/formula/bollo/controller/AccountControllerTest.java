package formula.bollo.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

import java.security.Principal;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import formula.bollo.impl.AccountImpl;
import formula.bollo.repository.AccountRepository;
import formula.bollo.service.AccountService;

@ExtendWith(MockitoExtension.class)
class AccountControllerTest {

    @InjectMocks
    private AccountController accountController;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountImpl accountImpl;

    @Mock
    private AccountService accountService;

    @Test
    void changePasswordWithoutPasswordIsRejected() {
        AccountService service = new AccountService(accountRepository, accountImpl, null, null);
        AccountController controller = new AccountController(accountRepository, accountImpl, service);
        ResponseEntity<String> response = controller.changePassword(new AccountController.PasswordChangeRequest(null), () -> "ana");

        assertEquals(400, response.getStatusCode().value());
        assertEquals("La contraseña debe tener al menos 8 caracteres", response.getBody());
        verifyNoInteractions(accountRepository, accountImpl);
    }

    @Test
    void changePasswordWithBlankPasswordIsRejected() {
        AccountService service = new AccountService(accountRepository, accountImpl, null, null);
        AccountController controller = new AccountController(accountRepository, accountImpl, service);
        ResponseEntity<String> response = controller.changePassword(new AccountController.PasswordChangeRequest("        "), () -> "ana");

        assertEquals(400, response.getStatusCode().value());
        assertEquals("La contraseña debe tener al menos 8 caracteres", response.getBody());
        verifyNoInteractions(accountRepository, accountImpl);
    }

    @Test
    void changePasswordWithOwnTokenIsAllowed() {
        Principal principal = () -> "ana";
        when(accountService.changePassword(principal, "nueva123")).thenReturn(ResponseEntity.ok("ok"));

        ResponseEntity<String> response = accountController.changePassword(new AccountController.PasswordChangeRequest("nueva123"), principal);

        assertEquals(200, response.getStatusCode().value());
        verify(accountService).changePassword(principal, "nueva123");
    }
}
