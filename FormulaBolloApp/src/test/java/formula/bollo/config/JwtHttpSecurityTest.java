package formula.bollo.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import formula.bollo.controller.*;
import formula.bollo.entity.Account;
import formula.bollo.impl.*;
import formula.bollo.mapper.AccountMapper;
import formula.bollo.model.AccountDTO;
import formula.bollo.repository.*;
import formula.bollo.service.*;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.DispatcherType;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;

// El contexto y sus mocks se comparten y se reinician en cada test: con la ejecución en paralelo del proyecto unos tests borrarían los mocks de otros.
@Execution(ExecutionMode.SAME_THREAD)
@SpringJUnitConfig(JwtHttpSecurityTest.Config.class)
@WebAppConfiguration
@TestPropertySource(properties = "jwt.secret=0123456789012345678901234567890123456789012345678901234567890123")
class JwtHttpSecurityTest {
    @Autowired WebApplicationContext context;
    @Autowired JwtConfig jwt;
    @Autowired AccountRepository repository;
    @Autowired AccountImpl mapper;
    @Autowired AccountService service;
    @Autowired EmailService email;
    @Autowired ResultService results;
    @Autowired FantasyService fantasy;
    MockMvc mvc;
    Account user;
    Account admin;
    final TruncatingBCryptPasswordEncoder encoder = new TruncatingBCryptPasswordEncoder();

    @BeforeEach
    void setup() {
        reset(repository, email, results, fantasy);
        user = new Account(1L, "ana", encoder.encode("old"), 0, "ana@example.com");
        admin = new Account(2L, "admin", encoder.encode("old"), 1, "admin@example.com");
        // La misma entidad mutable permite leer el hash guardado después del cambio real.
        when(repository.findByUsername("ana")).thenAnswer(i -> List.of(user));
        when(repository.findByUsername("admin")).thenAnswer(i -> List.of(admin));
        when(repository.findByEmail("ana@example.com")).thenReturn(List.of(user));
        when(repository.findById(1L)).thenReturn(Optional.of(user));
        when(repository.save(any(Account.class))).thenAnswer(i -> i.getArgument(0));
        when(results.deleteResults(anyInt())).thenReturn(ResponseEntity.ok("ok"));
        when(results.saveResults(anyList())).thenReturn(ResponseEntity.ok("ok"));
        when(fantasy.saveDriverTeamPoints(anyInt())).thenReturn(ResponseEntity.ok("ok"));
        when(fantasy.saveDriverTeamPrices(anyInt())).thenReturn(ResponseEntity.ok("ok"));
        when(fantasy.saveFantasyElection(any(), anyString())).thenReturn(ResponseEntity.ok("ok"));
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    String session(Account account) { return jwt.generateToken(mapper.accountToAccountDTO(account)); }
    String recovery(Account account) { return jwt.generateRecoveryToken(mapper.accountToAccountDTO(account)); }

    MockHttpServletRequestBuilder route(String method, String path) {
        return request(HttpMethod.valueOf(method), path).servletPath(path)
                .param("raceId", "1").param("id", "1")
                .contentType("application/json").content("[]");
    }

    MockHttpServletRequestBuilder change(String token) {
        return route("POST", "/account/changePassword").header("Authorization", "Bearer " + token)
                .content("{\"password\":\"new-password\"}");
    }

    @ParameterizedTest
    @CsvSource({"DELETE,/results/delete", "POST,/cache/update", "GET,/account/security-probe",
            "POST,/fantasy/saveDriverTeamPoints", "POST,/fantasy/saveDriverTeamPrices", "PUT,/results/save"})
    void adminMatrix(String method, String path) throws Exception {
        mvc.perform(route(method, path)).andExpect(status().isUnauthorized());
        mvc.perform(route(method, path).header("Authorization", "Bearer " + session(user)))
                .andExpect(status().isForbidden());
        mvc.perform(route(method, path).header("Authorization", "Bearer " + session(admin)))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @CsvSource({"GET,anonymous", "GET,user", "GET,admin", "PUT,anonymous", "PUT,user", "PUT,admin"})
    void fantasyAdminPricesRequiresAdminForBothVerbs(String method, String identity) throws Exception {
        var request = route(method, "/fantasy/adminPrices")
                .content("{\"drivers\":[{\"id\":1,\"price\":6000000}],\"teams\":[]}");
        if (!identity.equals("anonymous")) {
            request.header("Authorization", "Bearer " + session(identity.equals("admin") ? admin : user));
        }
        mvc.perform(request).andExpect(status().is(identity.equals("anonymous") ? 401 : identity.equals("user") ? 403 : 200));
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost:4200", "https://formulabollo.es"})
    void anonymousProtectedRequestIncludesCorsHeader(String origin) throws Exception {
        mvc.perform(route("GET", "/fantasy/fantasyElection").header("Origin", origin))
                .andExpect(status().isUnauthorized())
                .andExpect(header().stringValues("Access-Control-Allow-Origin", origin));
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost:4200", "https://formulabollo.es"})
    void normalUserOnAdminRouteIncludesCorsHeader(String origin) throws Exception {
        mvc.perform(route("PUT", "/results/save").header("Origin", origin)
                .header("Authorization", "Bearer " + session(user)))
                .andExpect(status().isForbidden())
                .andExpect(header().stringValues("Access-Control-Allow-Origin", origin));
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost:4200", "https://formulabollo.es"})
    void allowedOriginCanPreflightAdminPutRoute(String origin) throws Exception {
        mvc.perform(options("/results/save").servletPath("/results/save")
                .header("Origin", origin)
                .header("Access-Control-Request-Method", "PUT")
                .header("Access-Control-Request-Headers", "Authorization, Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().stringValues("Access-Control-Allow-Origin", origin))
                .andExpect(header().string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("PUT")))
                .andExpect(header().string("Access-Control-Allow-Headers", org.hamcrest.Matchers.containsString("Authorization")))
                .andExpect(header().string("Access-Control-Allow-Headers", org.hamcrest.Matchers.containsString("Content-Type")))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    @Test
    void foreignOriginCannotPreflightAdminPutRoute() throws Exception {
        mvc.perform(options("/results/save").servletPath("/results/save")
                .header("Origin", "https://foreign.example")
                .header("Access-Control-Request-Method", "PUT")
                .header("Access-Control-Request-Headers", "Authorization, Content-Type"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost:4200", "https://formulabollo.es"})
    void mvcResponsesIncludeSingleCorsHeader(String origin) throws Exception {
        mvc.perform(route("GET", "/drivers/teamHistory").param("driverName", "Driver With Spaces")
                .header("Origin", origin))
                .andExpect(status().isOk())
                .andExpect(header().stringValues("Access-Control-Allow-Origin", origin));
        mvc.perform(route("POST", "/account/login").content("{").header("Origin", origin))
                .andExpect(status().isBadRequest())
                .andExpect(header().stringValues("Access-Control-Allow-Origin", origin));
    }

    @Test
    void fantasyElectionRequiresAuthentication() throws Exception {
        mvc.perform(route("GET", "/fantasy/fantasyElection").param("userId", "999"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(fantasy);
    }

    @Test
    void driverTeamHistoryIsPublicWithOrWithoutRealSessionTokens() throws Exception {
        mvc.perform(route("GET", "/drivers/teamHistory").param("driverName", "Driver With Spaces"))
                .andExpect(status().isOk());
        for (Account account : List.of(user, admin)) {
            mvc.perform(route("GET", "/drivers/teamHistory").param("driverName", "Driver With Spaces")
                    .header("Authorization", "Bearer " + session(account))).andExpect(status().isOk());
        }
    }

    @Test
    void fantasyElectionAcceptsSessionWithoutClientUserId() throws Exception {
        mvc.perform(route("GET", "/fantasy/fantasyElection")
                .header("Authorization", "Bearer " + session(user)))
                .andExpect(status().isOk());
        verify(fantasy).getFantasyElection(1, "ana");
        verifyNoMoreInteractions(fantasy);
    }

    @Test
    void fantasyElectionIgnoresClientUserId() throws Exception {
        mvc.perform(route("GET", "/fantasy/fantasyElection").param("userId", "999")
                .header("Authorization", "Bearer " + session(user)))
                .andExpect(status().isOk());
        verify(fantasy).getFantasyElection(1, "ana");
        verifyNoMoreInteractions(fantasy);
    }

    @Test
    void passwordRequiresAuthenticationAndJson() throws Exception {
        mvc.perform(route("POST", "/account/changePassword").content("{\"password\":\"new\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(route("POST", "/account/changePassword").header("Authorization", "Bearer " + session(user))
                .content(""))
                .andExpect(status().isBadRequest());
        verify(repository, never()).save(any());
    }

    @Test
    void principalOwnsPasswordChange() throws Exception {
        String adminHash = admin.getPassword();
        // Aunque el cuerpo nombre a otra cuenta, solo cambia la del token.
        String otherAccount = admin.getUsername();
        String newValue = "new-password";
        mvc.perform(change(session(user))
                .content("{\"password\":\"" + newValue + "\",\"username\":\"" + otherAccount + "\"}"))
                .andExpect(status().isOk());
        assertTrue(encoder.matches("new-password", user.getPassword()));
        assertEquals(adminHash, admin.getPassword());
        verify(repository).save(user);
    }

    @ParameterizedTest
    @CsvSource({"DELETE,/results/delete", "POST,/cache/update", "GET,/account/security-probe",
            "POST,/fantasy/saveDriverTeamPoints", "POST,/fantasy/saveFantasyElection"})
    void recoveryCannotAuthenticateElsewhere(String method, String path) throws Exception {
        mvc.perform(route(method, path).content("{}")
                .header("Authorization", "Bearer " + recovery(admin))).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @CsvSource({"session", "recovery"})
    void passwordChangeRevokesBothKindsOfToken(String purpose) throws Exception {
        String oldSession = session(admin);
        String oldRecovery = recovery(admin);
        mvc.perform(route("POST", "/cache/update").header("Authorization", "Bearer " + oldSession))
                .andExpect(status().isOk());
        mvc.perform(change(purpose.equals("session") ? oldSession : oldRecovery)).andExpect(status().isOk());
        assertTrue(encoder.matches("new-password", admin.getPassword()));
        mvc.perform(route("POST", "/cache/update").header("Authorization", "Bearer " + oldSession))
                .andExpect(status().isUnauthorized());
        mvc.perform(change(oldSession)).andExpect(status().isUnauthorized());
        mvc.perform(change(oldRecovery)).andExpect(status().isUnauthorized());
        mvc.perform(route("POST", "/cache/update").header("Authorization", "Bearer " + session(admin)))
                .andExpect(status().isOk());
        verify(repository, times(1)).save(admin);
    }

    @Test
    void missingCredentialFingerprintIsRejected() throws Exception {
        // Claims es inmutable: se copia y se quita la huella para emular un token antiguo bien firmado.
        Map<String, Object> claims = new HashMap<>(jwt.extractAllClaims(session(admin)));
        claims.remove("credentialFingerprint");
        String legacy = Jwts.builder().claims(claims).signWith(jwt.getKey()).compact();
        mvc.perform(route("POST", "/cache/update").header("Authorization", "Bearer " + legacy))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authoritiesComeFromCurrentAccountNotClaims() throws Exception {
        AccountDTO forgedRole = mapper.accountToAccountDTO(user);
        forgedRole.setAdmin(1);
        mvc.perform(route("POST", "/cache/update").header("Authorization", "Bearer " + jwt.generateToken(forgedRole)))
                .andExpect(status().isForbidden());
    }

    @Test
    void publicRoutesRemainAccessibleAndIssuedTokensHaveCorrectClaims() throws Exception {
        String login = mvc.perform(route("POST", "/account/login")
                // Este contexto no lleva la configuración de Jackson de Spring Boot: sin "admin" el int primitivo falla.
                .content("{\"username\":\"ana\",\"password\":\"old\",\"admin\":0}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals("session", jwt.extractAllClaims(login).get("purpose"));
        mvc.perform(route("POST", "/account/register")
                .content("{\"username\":\"new\",\"password\":\"secret123\",\"email\":\"new@example.com\",\"admin\":0}"))
                .andExpect(status().isOk());
        mvc.perform(route("POST", "/results/totalPerSpecificDrivers").param("season", "1"))
                .andExpect(status().isOk());
        mvc.perform(route("POST", "/account/recoverPassword").param("email", "ana@example.com"))
                .andExpect(status().isOk());
        ArgumentCaptor<String> message = ArgumentCaptor.forClass(String.class);
        verify(email).sendSimpleMessage(eq("ana@example.com"), anyString(), message.capture());
        String token = message.getValue().split("fantasy/recoverPassword/")[1].trim();
        Claims claims = jwt.extractAllClaims(token);
        assertEquals("recovery", claims.get("purpose"));
        assertEquals(30 * 60 * 1000L, claims.getExpiration().getTime() - claims.getIssuedAt().getTime());
        assertTrue(claims.get("credentialFingerprint", String.class).matches("[0-9a-f]{16}"));
        mvc.perform(change(token)).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"a", "é"})
    void longPasswordsWorkThroughRegistrationLoginAndChange(String character) throws Exception {
        String password = character.repeat(100);
        mvc.perform(route("POST", "/account/register").characterEncoding("UTF-8")
                .content("{\"username\":\"new\",\"password\":\"" + password
                        + "\",\"email\":\"new@example.com\",\"admin\":0}"))
                .andExpect(status().isOk());
        ArgumentCaptor<Account> saved = ArgumentCaptor.forClass(Account.class);
        verify(repository).save(saved.capture());
        Account registered = saved.getValue();
        assertTrue(encoder.matches(password, registered.getPassword()));
        when(repository.findByUsername("new")).thenReturn(List.of(registered));
        mvc.perform(route("POST", "/account/login").characterEncoding("UTF-8")
                .content("{\"username\":\"new\",\"password\":\"" + password + "\",\"admin\":0}"))
                .andExpect(status().isOk());

        String changedPassword = "changed-" + password;
        mvc.perform(change(session(user)).characterEncoding("UTF-8")
                .content("{\"password\":\"" + changedPassword + "\"}"))
                .andExpect(status().isOk());
        assertTrue(encoder.matches(changedPassword, user.getPassword()));
        mvc.perform(route("POST", "/account/login").characterEncoding("UTF-8")
                .content("{\"username\":\"ana\",\"password\":\"" + changedPassword + "\",\"admin\":0}"))
                .andExpect(status().isOk());
    }

    @Test
    void anonymousProtectedRequestReturnsUnauthorized() throws Exception {
        mvc.perform(route("GET", "/fantasy/fantasyElection"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(fantasy);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "malformed", "expired", "subject", "expiration", "unknown", "claimType"})
    void invalidTokensRemainUnauthenticated(String invalid) throws Exception {
        String token = invalid;
        if ("expired".equals(invalid)) {
            token = jwt.generateToken(mapper.accountToAccountDTO(user), -1);
        } else if (List.of("subject", "expiration", "unknown", "claimType").contains(invalid)) {
            Map<String, Object> claims = new HashMap<>(jwt.extractAllClaims(session(user)));
            switch (invalid) {
                case "subject" -> claims.remove("sub");
                case "expiration" -> claims.remove("exp");
                case "unknown" -> claims.put("sub", "missing");
                case "claimType" -> claims.put("purpose", List.of("session"));
            }
            token = Jwts.builder().claims(claims).signWith(jwt.getKey()).compact();
        }

        mvc.perform(route("GET", "/fantasy/fantasyElection").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(fantasy);
    }

    @Test
    void sessionRevokedByPasswordChangeReturnsUnauthorized() throws Exception {
        String token = session(user);
        mvc.perform(change(token)).andExpect(status().isOk());
        assertTrue(encoder.matches("new-password", user.getPassword()));
        verify(repository).save(user);

        mvc.perform(route("GET", "/fantasy/fantasyElection")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(fantasy);
    }

    @Test
    void accountLookupResourceFailurePropagates() {
        String token = session(user);
        DataAccessResourceFailureException failure = new DataAccessResourceFailureException("Database unavailable");
        when(repository.findByUsername("ana")).thenThrow(failure);

        assertSame(failure, assertThrows(DataAccessResourceFailureException.class,
                () -> mvc.perform(route("GET", "/fantasy/fantasyElection")
                        .header("Authorization", "Bearer " + token))));
        verify(repository).findByUsername("ana");
        verifyNoInteractions(fantasy);
    }

    @Test
    void accountLookupTransactionFailurePropagates() {
        String token = session(user);
        CannotCreateTransactionException failure = new CannotCreateTransactionException("Cannot connect to database");
        when(repository.findByUsername("ana")).thenThrow(failure);

        assertSame(failure, assertThrows(CannotCreateTransactionException.class,
                () -> mvc.perform(route("GET", "/fantasy/fantasyElection")
                        .header("Authorization", "Bearer " + token))));
        verify(repository).findByUsername("ana");
        verifyNoInteractions(fantasy);
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost:4200", "https://formulabollo.es"})
    void anonymousPostErrorDispatchIsNotRejectedBySecurity(String origin) throws Exception {
        mvc.perform(route("POST", "/error").header("Origin", origin).with(request -> {
            request.setDispatcherType(DispatcherType.ERROR);
            return request;
        })).andExpect(result -> {
            int responseStatus = result.getResponse().getStatus();
            assertNotEquals(401, responseStatus);
            assertNotEquals(403, responseStatus);
        }).andExpect(header().stringValues("Access-Control-Allow-Origin", origin));
    }

    @org.springframework.web.bind.annotation.RestController
    static class AccountSecurityProbe {
        @org.springframework.web.bind.annotation.GetMapping("/account/security-probe")
        String probe() { return "ok"; }
    }

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    @Import({SecurityConfigurer.class, JwtRequestFilter.class, JwtConfig.class, CorsConfig.class, AccountService.class, AccountController.class, AccountSecurityProbe.class})
    static class Config {
        @Bean AccountRepository repository() { return mock(AccountRepository.class); }
        @Bean AccountImpl mapper() { return new AccountImpl(Mappers.getMapper(AccountMapper.class)); }
        @Bean EmailService email() { return mock(EmailService.class); }
        @Bean ResultService results() { return mock(ResultService.class); }
        @Bean FantasyService fantasy() { return mock(FantasyService.class); }
        @Bean UserDetailsService users(AccountRepository repository) {
            return name -> {
                List<Account> accounts = repository.findByUsername(name);
                if (accounts.isEmpty()) throw new UsernameNotFoundException("Usuario no encontrado");
                Account account = accounts.getFirst();
                return User.withUsername(account.getUsername()).password(account.getPassword())
                        .roles(account.getAdmin() == 1 ? "ADMIN" : "USER").build();
            };
        }
        @Bean ResultController resultController(ResultService service) {
            return new ResultController(mock(ResultRepository.class), mock(ResultImpl.class), service);
        }
        @Bean CacheController cacheController() {
            return new CacheController(mock(CacheService.class), mock(CacheNotifier.class));
        }
        @Bean DriverController driverController() {
            return new DriverController(mock(DriverRepository.class), mock(DriverImpl.class), mock(DriverService.class));
        }
        @Bean FantasyController fantasyController(FantasyService service) {
            return new FantasyController(mock(FantasyPointsDriverRepository.class), mock(FantasyPriceDriverRepository.class),
                    mock(FantasyPriceTeamRepository.class), mock(FantasyPointsTeamRepository.class),
                    mock(FantasyPriceImpl.class), mock(FantasyPointsImpl.class), service);
        }
    }
}
