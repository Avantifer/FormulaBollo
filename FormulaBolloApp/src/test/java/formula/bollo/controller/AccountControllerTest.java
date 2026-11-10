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
        ResponseEntity<String> response = accountController.changePassword(new AccountController.PasswordChangeRequest(null), () -> "ana");

        assertEquals(400, response.getStatusCode().value());
        verifyNoInteractions(accountService);
    }

    @Test
    void changePasswordWithBlankPasswordIsRejected() {
        ResponseEntity<String> response = accountController.changePassword(new AccountController.PasswordChangeRequest(" "), () -> "ana");

        assertEquals(400, response.getStatusCode().value());
        verifyNoInteractions(accountService);
    }

    @Test
    void changePasswordWithOwnTokenIsAllowed() {
        Principal principal = () -> "ana";
        when(accountService.changePassword(principal, "nueva")).thenReturn(ResponseEntity.ok("ok"));

        ResponseEntity<String> response = accountController.changePassword(new AccountController.PasswordChangeRequest("nueva"), principal);

        assertEquals(200, response.getStatusCode().value());
        verify(accountService).changePassword(principal, "nueva");
    }
}
