package formula.bollo.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

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
    void changePasswordWithoutTokenIsRejected() {
        ResponseEntity<String> response = accountController.changePassword("ana", "nueva", null);

        assertEquals(403, response.getStatusCode().value());
        verifyNoInteractions(accountService);
    }

    @Test
    void changePasswordWithAnotherUsersTokenIsRejected() {
        ResponseEntity<String> response = accountController.changePassword("ana", "nueva", () -> "bob");

        assertEquals(403, response.getStatusCode().value());
        verifyNoInteractions(accountService);
    }

    @Test
    void changePasswordWithOwnTokenIsAllowed() {
        when(accountService.changePassword("ana", "nueva")).thenReturn(ResponseEntity.ok("ok"));

        ResponseEntity<String> response = accountController.changePassword("ana", "nueva", () -> "ana");

        assertEquals(200, response.getStatusCode().value());
    }
}
