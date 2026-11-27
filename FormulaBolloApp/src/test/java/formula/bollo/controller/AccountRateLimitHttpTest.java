package formula.bollo.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import formula.bollo.config.JwtConfig;
import formula.bollo.impl.AccountImpl;
import formula.bollo.repository.AccountRepository;
import formula.bollo.service.AccountService;
import formula.bollo.service.EmailService;

class AccountRateLimitHttpTest {
    private AccountRepository repository;
    private AccountService service;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        repository = mock(AccountRepository.class);
        AccountImpl mapper = mock(AccountImpl.class);
        service = new AccountService(repository, mapper, mock(JwtConfig.class), mock(EmailService.class));
        mvc = MockMvcBuilders.standaloneSetup(new AccountController(service)).build();
    }

    @Test
    void loginLimitReturns429AndRetryAfterAndUsesRemoteAddress() throws Exception {
        for (int i = 0; i < 10; i++) {
            mvc.perform(post("/account/login").contentType("application/json")
                    .content("{\"username\":\"ana\",\"password\":\"bad\",\"admin\":0}"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/account/login").contentType("application/json")
                .header("X-Forwarded-For", "other-ip")
                .content("{\"username\":\"ana\",\"password\":\"bad\",\"admin\":0}"))
                .andExpect(status().isTooManyRequests()).andExpect(header().exists("Retry-After"));
        mvc.perform(post("/account/login").contentType("application/json")
                .with(request -> { request.setRemoteAddr("192.0.2.1"); return request; })
                .content("{\"username\":\"ana\",\"password\":\"bad\",\"admin\":0}"))
                .andExpect(status().isUnauthorized());
        verify(repository, times(11)).findByUsername("ana");
    }

    @Test
    void recoveryLimitReturns429WithoutLookingUpBlockedEmails() throws Exception {
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/account/recoverPassword").param("email", " ANA@EXAMPLE.COM "))
                    .andExpect(status().isOk());
        }
        mvc.perform(post("/account/recoverPassword").param("email", "ana@example.com"))
                .andExpect(status().isTooManyRequests()).andExpect(header().exists("Retry-After"));
        verify(repository, times(3)).findByEmail("ana@example.com");
    }

    @Test
    void configuredLimitsAreUsedByTheHttpEndpoints() throws Exception {
        ReflectionTestUtils.invokeMethod(service, "configureAttemptLimits", "PT30S", 1, 2, 1, 2, 2, 2);
        mvc.perform(post("/account/recoverPassword").param("email", "ana@example.com"))
                .andExpect(status().isOk());
        mvc.perform(post("/account/recoverPassword").param("email", "ana@example.com"))
                .andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After", "30"));
        for (int i = 0; i < 2; i++) {
            String ip = "192.0.2." + i;
            mvc.perform(post("/account/login").contentType("application/json")
                    .with(request -> { request.setRemoteAddr(ip); return request; })
                    .content("{\"username\":\"ana\",\"password\":\"bad\",\"admin\":0}"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/account/login").contentType("application/json")
                .with(request -> { request.setRemoteAddr("192.0.2.3"); return request; })
                .content("{\"username\":\"ana\",\"password\":\"bad\",\"admin\":0}"))
                .andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After", "30"));
        verify(repository, times(2)).findByUsername("ana");
    }

    @Test
    void registrationValidationAndConflictsReachHttpClients() throws Exception {
        mvc.perform(post("/account/register").contentType("application/json")
                .content("{\"username\":\"ana\",\"password\":\" \",\"email\":\"ana@example.com\",\"admin\":0}"))
                .andExpect(status().isBadRequest());
        when(repository.findByUsername("ana")).thenReturn(java.util.List.of(new formula.bollo.entity.Account()));
        mvc.perform(post("/account/register").contentType("application/json")
                .content("{\"username\":\"ana\",\"password\":\"password\",\"email\":\"ana@example.com\",\"admin\":0}"))
                .andExpect(status().isConflict());
    }
}
