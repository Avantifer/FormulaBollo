package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.io.IOException;
import java.util.List;
import java.util.Properties;
import java.util.stream.Collectors;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.ThrowableProxyUtil;
import ch.qos.logback.core.read.ListAppender;
import formula.bollo.config.JwtConfig;
import formula.bollo.config.WebSocketConfig;
import formula.bollo.controller.AccountController;
import formula.bollo.controller.ResultController;
import formula.bollo.controller.SprintController;
import formula.bollo.entity.Account;
import formula.bollo.impl.*;
import formula.bollo.model.*;
import formula.bollo.repository.*;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Isolated;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.socket.WebSocketSession;

// This test captures shared application logging state.
@Isolated
class LoggingOpsBehaviorTest {
    private static final String IP = "192.0.2.42";
    private static final String USERNAME = "fernando-private";
    private static final String PASSWORD = "private-password-987";
    private static final String EMAIL = "private-recipient@example.com";
    private static final String TOKEN = "private-recovery-token-456";
    private static final String FRONTEND = "https://recovery.example.test/";
    private static final String LINK = FRONTEND + "fantasy/recoverPassword/" + TOKEN;

    private final ListAppender<ILoggingEvent> events = new ListAppender<>();
    private Logger logger;
    private Level previousLevel;
    private boolean previousAdditivity;

    @BeforeEach
    void captureApplicationLogsWithoutFileAppenders() {
        logger = (Logger) LoggerFactory.getLogger("formula.bollo");
        previousLevel = logger.getLevel();
        previousAdditivity = logger.isAdditive();
        logger.setLevel(Level.INFO);
        logger.setAdditive(false);
        events.setContext(logger.getLoggerContext());
        events.start();
        logger.addAppender(events);
    }

    @AfterEach
    void restoreLogging() {
        logger.detachAppender(events);
        logger.setLevel(previousLevel);
        logger.setAdditive(previousAdditivity);
        events.stop();
    }

    @Test
    void passwordChangeRequestDoesNotExposePasswordInToString() {
        var request = new AccountController.PasswordChangeRequest(PASSWORD);
        assertFalse(request.toString().contains(PASSWORD), request.toString());
    }

    @Test
    void recoveryMailFailureLogsSanitizedRootCauseAndAccountIdWithUnchangedResponse() throws Exception {
        AccountRepository repository = mock(AccountRepository.class);
        AccountImpl mapper = mock(AccountImpl.class);
        JwtConfig jwt = mock(JwtConfig.class);
        JavaMailSender sender = mock(JavaMailSender.class);
        EmailService emailService = new EmailService(sender);
        ReflectionTestUtils.setField(emailService, "emailFrom", "sender@example.test");
        AccountService service = new AccountService(repository, mapper, jwt, emailService);
        ReflectionTestUtils.setField(service, "frontendUrl", FRONTEND);
        Account account = new Account(7341L, USERNAME, PASSWORD, 0, EMAIL);
        AccountDTO dto = new AccountDTO(7341L, USERNAME, PASSWORD, 0, EMAIL);
        when(repository.findByEmail(EMAIL)).thenReturn(List.of(account));
        when(mapper.accountToAccountDTO(account)).thenReturn(dto);
        when(jwt.generateRecoveryToken(dto)).thenReturn(TOKEN);
        when(sender.createMimeMessage()).thenAnswer(ignored -> new MimeMessage(Session.getInstance(new Properties())));
        AccountController controller = new AccountController(repository, mapper, service);

        ResponseEntity<String> success = controller.recoverPassword(EMAIL, request());
        events.list.clear();
        IOException cause = new IOException("SMTP delivery rejected for " + EMAIL + " at " + LINK
                + " token=" + TOKEN + " sender=other-private@example.test\r\nforged line");
        doThrow(new MailSendException("Cannot send to " + EMAIL, cause)).when(sender).send(any(MimeMessage.class));

        ResponseEntity<String> failed = controller.recoverPassword(EMAIL, request());

        var sent = org.mockito.ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender, times(2)).send(sent.capture());
        assertTrue(sent.getValue().getContent().toString().contains(LINK));
        String logs = renderedLogs();
        assertAll(
                () -> assertEquals(200, success.getStatusCode().value()),
                () -> assertEquals(success, failed, "Mail failure must be indistinguishable from success"),
                () -> assertTrue(logs.contains("IOException"), logs),
                () -> assertTrue(logs.contains("SMTP delivery rejected"), logs),
                () -> assertTrue(logs.contains("7341"), logs),
                () -> assertFalse(logs.contains(EMAIL), logs),
                () -> assertFalse(logs.contains(TOKEN), logs),
                () -> assertFalse(logs.contains("other-private@example.test"), logs),
                () -> assertTrue(events.list.stream().noneMatch(event ->
                        event.getFormattedMessage().matches("(?s).*[\\r\\n].*")), logs),
                () -> assertFalse(logs.contains(FRONTEND), logs),
                () -> assertFalse(logs.contains(LINK), logs));
    }

    @Test
    void failedLoginWarnsWithIpAndMaskedUsername() {
        AccountController controller = accountController();
        assertEquals(401, controller.login(credentials(), request()).getStatusCode().value());
        assertLoginWarning();
    }

    @Test
    void blockedLoginEmitsItsOwnWarningWithIpAndMaskedUsername() {
        AccountController controller = accountController();
        assertEquals(401, controller.login(credentials(), request()).getStatusCode().value());
        events.list.clear(); // A warning from the failed authentication cannot satisfy this assertion.
        assertEquals(429, controller.login(credentials(), request()).getStatusCode().value());
        assertLoginWarning();
    }

    @Test
    void loginWarningsCannotForgeLogLines() {
        AccountController controller = accountController();
        AccountDTO input = credentials();
        input.setUsername("\r\nprivate-name");
        var request = request();
        request.setRemoteAddr(IP + "\r\n\u0085\u2028\u2029forged line");

        assertEquals(401, controller.login(input, request).getStatusCode().value());
        assertEquals(429, controller.login(input, request).getStatusCode().value());

        var warnings = events.list.stream().filter(event -> event.getLevel() == Level.WARN).toList();
        assertEquals(2, warnings.size());
        assertTrue(warnings.stream().allMatch(event -> event.getFormattedMessage().contains(IP)
                && event.getFormattedMessage().contains("***")
                && !event.getFormattedMessage().matches("(?s).*[\\p{Cc}\\p{Zl}\\p{Zp}].*")));
        assertFalse(renderedLogs().contains("private-name"));
    }

    @Test
    void blockedRecoveryWarnsWithIpWithoutEmail() {
        AccountController controller = accountController();
        assertEquals(200, controller.recoverPassword(EMAIL, request()).getStatusCode().value());
        events.list.clear();
        assertEquals(429, controller.recoverPassword(EMAIL, request()).getStatusCode().value());
        assertAll(
                () -> assertEquals(1, events.list.stream().filter(event -> event.getLevel() == Level.WARN).count()),
                () -> assertTrue(events.list.stream().anyMatch(event -> event.getLevel() == Level.WARN
                        && event.getFormattedMessage().contains(IP)), renderedLogs()),
                () -> assertFalse(renderedLogs().contains(EMAIL), renderedLogs()));
    }

    @Test
    void blockedRecoveryWarningCannotForgeLogLines() {
        AccountController controller = accountController();
        var request = request();
        request.setRemoteAddr(IP + "\r\n\u0085\u2028\u2029forged line");
        assertEquals(200, controller.recoverPassword(EMAIL, request).getStatusCode().value());
        events.list.clear();

        assertEquals(429, controller.recoverPassword(EMAIL, request).getStatusCode().value());

        var warnings = events.list.stream().filter(event -> event.getLevel() == Level.WARN).toList();
        assertEquals(1, warnings.size());
        assertFalse(warnings.getFirst().getFormattedMessage().matches("(?s).*[\\p{Cc}\\p{Zl}\\p{Zp}].*"));
        assertFalse(renderedLogs().contains(EMAIL));
    }

    @Test
    void missingSeasonThrowsBadRequestMentioningItsNumber() {
        SeasonRepository seasons = mock(SeasonRepository.class);
        RaceRepository races = mock(RaceRepository.class);
        RaceImpl mapper = mock(RaceImpl.class);
        RaceService service = new RaceService(seasons, races, mock(SeasonImpl.class), mapper);
        RaceDTO race = new RaceDTO();
        race.setName("Test race");
        race.setSeason(new SeasonDTO(1L, "Missing", 2042, "2042"));
        when(seasons.findByNumber(2042)).thenReturn(null);

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.saveRace(race));

        assertAll(
                () -> assertEquals(400, error.getStatusCode().value()),
                () -> assertNotNull(error.getReason()),
                () -> assertTrue(String.valueOf(error.getReason()).contains("2042")));
        verifyNoInteractions(races, mapper);
    }

    @Test
    void webSocketTransportErrorCarriesThrowableEvenWithoutMessage() throws Exception {
        CacheService cache = mock(CacheService.class);
        when(cache.getCurrentVersion()).thenReturn(1);
        var handler = new WebSocketConfig.CacheWebSocketHandler(cache);
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("transport-session");
        IOException failure = new IOException();

        handler.handleTransportError(session, failure);

        assertTrue(events.list.stream().anyMatch(event -> event.getLevel() == Level.ERROR
                && event.getThrowableProxy() != null
                && event.getThrowableProxy().getClassName().equals(IOException.class.getName())
                && event.getThrowableProxy().getMessage() == null
                && java.util.Arrays.equals(failure.getStackTrace(),
                        java.util.Arrays.stream(event.getThrowableProxy().getStackTraceElementProxyArray())
                                .map(ch.qos.logback.classic.spi.StackTraceElementProxy::getStackTraceElement)
                                .toArray(StackTraceElement[]::new))), renderedLogs());
    }

    @Test
    void saveResultsLogsRaceAndItemCountWithoutDtoContents() {
        RaceDTO race = race();
        DriverDTO driver = driver();
        ResultDTO first = new ResultDTO(8501L, race, driver, null, 0, 0);
        ResultDTO second = new ResultDTO(8502L, race, driver, null, 0, 0);
        List<ResultDTO> input = List.of(first, second);
        ResultService service = mock(ResultService.class);
        when(service.saveResults(input)).thenReturn(ResponseEntity.ok("saved"));
        var controller = new ResultController(mock(ResultRepository.class), mock(ResultImpl.class), service);

        assertEquals(200, controller.saveResults(input).getStatusCode().value());
        verify(service).saveResults(input);
        assertBatchSummary("ResultDTO", "8501", "8502");
    }

    @Test
    void saveSprintsLogsRaceAndItemCountWithoutDtoContents() {
        RaceDTO race = race();
        DriverDTO driver = driver();
        List<SprintDTO> input = List.of(new SprintDTO(8601L, race, driver, null),
                new SprintDTO(8602L, race, driver, null));
        SprintService service = mock(SprintService.class);
        when(service.saveSprints(input)).thenReturn(ResponseEntity.ok("saved"));
        var controller = new SprintController(mock(SprintRepository.class), mock(SprintImpl.class), service);

        assertEquals(200, controller.saveSprintsCircuit(input).getStatusCode().value());
        verify(service).saveSprints(input);
        assertBatchSummary("SprintDTO", "8601", "8602");
    }

    @Test
    void incompleteResultBatchesReachServiceWithoutLoggingFailures() {
        ResultService service = mock(ResultService.class);
        var controller = new ResultController(mock(ResultRepository.class), mock(ResultImpl.class), service);
        List<ResultDTO> incomplete = java.util.Arrays.asList(null, new ResultDTO(),
                new ResultDTO(null, new RaceDTO(), null, null, 0, 0));

        assertDoesNotThrow(() -> controller.saveResults(null));
        assertDoesNotThrow(() -> controller.saveResults(List.of()));
        assertDoesNotThrow(() -> controller.saveResults(incomplete));

        verify(service).saveResults(null);
        verify(service).saveResults(List.of());
        verify(service).saveResults(incomplete);
        assertFalse(renderedLogs().contains("ResultDTO"));
    }

    @Test
    void incompleteSprintBatchesReachServiceWithoutLoggingFailures() {
        SprintService service = mock(SprintService.class);
        var controller = new SprintController(mock(SprintRepository.class), mock(SprintImpl.class), service);
        List<SprintDTO> incomplete = java.util.Arrays.asList(null, new SprintDTO(),
                new SprintDTO(null, new RaceDTO(), null, null));

        assertDoesNotThrow(() -> controller.saveSprintsCircuit(null));
        assertDoesNotThrow(() -> controller.saveSprintsCircuit(List.of()));
        assertDoesNotThrow(() -> controller.saveSprintsCircuit(incomplete));

        verify(service).saveSprints(null);
        verify(service).saveSprints(List.of());
        verify(service).saveSprints(incomplete);
        assertFalse(renderedLogs().contains("SprintDTO"));
    }

    private AccountController accountController() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountImpl mapper = mock(AccountImpl.class);
        AccountService service = new AccountService(repository, mapper, mock(JwtConfig.class), mock(EmailService.class));
        service.configureAttemptLimits("PT15M", 1, 30, 1, 20, 10, 50);
        return new AccountController(repository, mapper, service);
    }

    private AccountDTO credentials() {
        return new AccountDTO(null, USERNAME, PASSWORD, 0, EMAIL);
    }

    private MockHttpServletRequest request() {
        var request = new MockHttpServletRequest();
        request.setRemoteAddr(IP);
        return request;
    }

    private void assertLoginWarning() {
        String logs = renderedLogs();
        assertAll(
                () -> assertEquals(1, events.list.stream().filter(event -> event.getLevel() == Level.WARN).count(), logs),
                () -> assertTrue(events.list.stream().anyMatch(event -> event.getLevel() == Level.WARN
                        && event.getFormattedMessage().contains(IP)
                        && event.getFormattedMessage().contains("fe***")), logs),
                () -> assertFalse(logs.contains(USERNAME), logs),
                () -> assertFalse(logs.contains(PASSWORD), logs));
    }

    private RaceDTO race() {
        RaceDTO race = new RaceDTO();
        race.setId(7341L);
        race.setName("private-race-details");
        return race;
    }

    private DriverDTO driver() {
        DriverDTO driver = new DriverDTO();
        driver.setName("private-driver-details");
        return driver;
    }

    private void assertBatchSummary(String dtoType, String firstId, String secondId) {
        String logs = renderedLogs();
        assertAll(
                () -> assertTrue(events.list.stream().anyMatch(event ->
                        event.getFormattedMessage().matches("(?s).*\\b7341\\b.*")
                                && event.getFormattedMessage().matches("(?s).*\\b2\\b.*")), logs),
                () -> assertFalse(logs.contains(dtoType), logs),
                () -> assertFalse(logs.contains("private-driver-details"), logs),
                () -> assertFalse(logs.contains("private-race-details"), logs),
                () -> assertFalse(logs.contains(firstId), logs),
                () -> assertFalse(logs.contains(secondId), logs));
    }

    private String renderedLogs() {
        return events.list.stream().map(event -> event.getFormattedMessage()
                + (event.getThrowableProxy() == null ? "" : ThrowableProxyUtil.asString(event.getThrowableProxy())))
                .collect(Collectors.joining("\n"));
    }
}
