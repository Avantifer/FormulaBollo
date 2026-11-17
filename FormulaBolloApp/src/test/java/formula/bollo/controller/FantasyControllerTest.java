package formula.bollo.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.LoggerFactory;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;

import formula.bollo.impl.FantasyPointsImpl;
import formula.bollo.impl.FantasyPriceImpl;
import formula.bollo.model.AccountDTO;
import formula.bollo.model.FantasyElectionDTO;
import formula.bollo.model.FantasyPointsAccountDTO;
import formula.bollo.repository.FantasyPointsDriverRepository;
import formula.bollo.repository.FantasyPointsTeamRepository;
import formula.bollo.repository.FantasyPriceDriverRepository;
import formula.bollo.repository.FantasyPriceTeamRepository;
import formula.bollo.service.FantasyService;

@ExtendWith(MockitoExtension.class)
class FantasyControllerTest {

    @InjectMocks
    private FantasyController fantasyController;

    @Mock
    private FantasyPointsDriverRepository fantasyPointsDriverRepository;

    @Mock
    private FantasyPriceDriverRepository fantasyPriceDriverRepository;

    @Mock
    private FantasyPriceTeamRepository fantasyPriceTeamRepository;

    @Mock
    private FantasyPointsTeamRepository fantasyPointsTeamRepository;

    @Mock
    private FantasyPriceImpl fantasyPriceImpl;

    @Mock
    private FantasyPointsImpl fantasyPointsImpl;

    @Mock
    private FantasyService fantasyService;

    private FantasyElectionDTO electionOf(String username) {
        FantasyElectionDTO election = new FantasyElectionDTO();
        election.setAccount(new AccountDTO(1L, username, null, 0, null));
        return election;
    }

    @Test
    void getFantasyElectionWithoutPrincipalIsRejected() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> fantasyController.getFantasyElection(12, null));

        assertEquals(403, error.getStatusCode().value());
        verifyNoInteractions(fantasyService);
    }

    @Test
    void getFantasyElectionUsesPrincipalUsername() {
        FantasyElectionDTO election = electionOf("ana");
        when(fantasyService.getFantasyElection(12, "ana")).thenReturn(election);

        assertSame(election, fantasyController.getFantasyElection(12, () -> "ana"));
        verify(fantasyService).getFantasyElection(12, "ana");
    }

    @Test
    void getFantasyPointsRaceUsesFinishedRaceEntryPoint() {
        List<FantasyPointsAccountDTO> points = List.of(new FantasyPointsAccountDTO());
        when(fantasyService.getFantasyPointsRace(12)).thenReturn(points);

        assertSame(points, fantasyController.getFantasyPointsRace(12));
        verify(fantasyService).getFantasyPointsRace(12);
    }

    @Test
    void saveFantasyElectionWithoutTokenIsRejected() {
        ResponseEntity<String> response = fantasyController.saveFantasyElection(electionOf("ana"), null);

        assertEquals(403, response.getStatusCode().value());
        verifyNoInteractions(fantasyService);
    }

    @Test
    void saveFantasyElectionUsesPrincipalInsteadOfClientOwner() {
        FantasyElectionDTO election = electionOf("ana");
        when(fantasyService.saveFantasyElection(election, "bob")).thenReturn(ResponseEntity.ok("ok"));
        ResponseEntity<String> response = fantasyController.saveFantasyElection(election, () -> "bob");

        assertEquals(200, response.getStatusCode().value());
        verify(fantasyService).saveFantasyElection(election, "bob");
    }

    @Test
    void saveFantasyElectionOfTheOwnUserIsAllowed() {
        FantasyElectionDTO election = electionOf("ana");
        election.setId(99L);
        election.getAccount().setId(35L);
        when(fantasyService.saveFantasyElection(election, "ana")).thenReturn(ResponseEntity.ok("ok"));

        ResponseEntity<String> response = fantasyController.saveFantasyElection(election, () -> "ana");

        assertEquals(200, response.getStatusCode().value());
        verify(fantasyService).saveFantasyElection(election, "ana");
    }

    @Test
    void savingElectionDoesNotLogEmailUsernames() {
        String email = "fantasy-privacy-regression@private.example";
        FantasyElectionDTO election = electionOf(email);
        when(fantasyService.saveFantasyElection(election, email))
                .thenReturn(ResponseEntity.ok("ok"));
        Logger logger = (Logger) LoggerFactory.getLogger(FantasyController.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            fantasyController.saveFantasyElection(election, () -> email);
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        synchronized (appender) {
            assertFalse(appender.list.stream().anyMatch(event -> event.getFormattedMessage().contains(email)));
        }
        verify(fantasyService).saveFantasyElection(election, email);
    }
}
