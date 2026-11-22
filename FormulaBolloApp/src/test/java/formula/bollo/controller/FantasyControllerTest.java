package formula.bollo.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.slf4j.LoggerFactory;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;

import formula.bollo.impl.FantasyPointsImpl;
import formula.bollo.impl.FantasyPriceImpl;
import formula.bollo.model.AccountDTO;
import formula.bollo.model.FantasyElectionDTO;
import formula.bollo.model.FantasyPointsAccountDTO;
import formula.bollo.model.FantasyClasificationDTO;
import formula.bollo.model.FantasyClasificationRaceDTO;
import formula.bollo.model.FantasyClasificationEntryDTO;
import formula.bollo.model.FantasyClasificationDriverPickDTO;
import formula.bollo.model.FantasyClasificationTeamPickDTO;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.TeamDTO;
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
    void clasificationSerializesExactContractAndPublicAccountFields() throws Exception {
        DriverDTO driver = new DriverDTO(1L, "Driver", 7, "", null, null);
        TeamDTO team = new TeamDTO(2L, "Team", "", "", null);
        AccountDTO account = new AccountDTO(3L, "Ana", "test-password", 1, "ana@example.test");
        when(fantasyService.getFantasyClasification(4)).thenReturn(new FantasyClasificationDTO(4,
                List.of(new FantasyClasificationRaceDTO(8L, "Race", 1, true),
                        new FantasyClasificationRaceDTO(9L, "Next", 2, false)),
                List.of(driver, new DriverDTO(4L, "Second", 8, "", null, null),
                        new DriverDTO(5L, "Third", 9, "", null, null)),
                List.of(team, new TeamDTO(6L, "Other", "", "", null)),
                List.of(new FantasyClasificationEntryDTO(8L, account, 25,
                        List.of(new FantasyClasificationDriverPickDTO(1L, 10),
                                new FantasyClasificationDriverPickDTO(4L, 0),
                                new FantasyClasificationDriverPickDTO(5L, 5)),
                        List.of(new FantasyClasificationTeamPickDTO(2L, 7),
                                new FantasyClasificationTeamPickDTO(6L, 3))))));

        MockMvcBuilders.standaloneSetup(fantasyController).build()
                .perform(get("/fantasy/clasification").param("numberSeason", "4"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$.season").value(4))
                .andExpect(jsonPath("$.races.length()").value(2))
                .andExpect(jsonPath("$.races[0].length()").value(4))
                .andExpect(jsonPath("$.races[0].id").value(8))
                .andExpect(jsonPath("$.races[0].name").value("Race"))
                .andExpect(jsonPath("$.races[0].order").value(1))
                .andExpect(jsonPath("$.races[0].finished").value(true))
                .andExpect(jsonPath("$.races[1].finished").value(false))
                .andExpect(jsonPath("$.drivers[0].id").value(1))
                .andExpect(jsonPath("$.drivers[0].name").value("Driver"))
                .andExpect(jsonPath("$.teams[0].id").value(2))
                .andExpect(jsonPath("$.teams[0].name").value("Team"))
                .andExpect(jsonPath("$.entries.length()").value(1))
                .andExpect(jsonPath("$.entries[0].length()").value(5))
                .andExpect(jsonPath("$.entries[0].raceId").value(8))
                .andExpect(jsonPath("$.entries[0].account.length()").value(2))
                .andExpect(jsonPath("$.entries[0].account.id").value(3))
                .andExpect(jsonPath("$.entries[0].account.username").value("Ana"))
                .andExpect(jsonPath("$.entries[0].account.password").doesNotExist())
                .andExpect(jsonPath("$.entries[0].account.email").doesNotExist())
                .andExpect(jsonPath("$.entries[0].account.admin").doesNotExist())
                .andExpect(jsonPath("$.entries[0].points").value(25))
                .andExpect(jsonPath("$.entries[0].drivers.length()").value(3))
                .andExpect(jsonPath("$.entries[0].drivers[0].length()").value(2))
                .andExpect(jsonPath("$.entries[0].drivers[0].driverId").value(1))
                .andExpect(jsonPath("$.entries[0].drivers[0].points").value(10))
                .andExpect(jsonPath("$.entries[0].drivers[1].points").value(0))
                .andExpect(jsonPath("$.entries[0].teams.length()").value(2))
                .andExpect(jsonPath("$.entries[0].teams[0].length()").value(2))
                .andExpect(jsonPath("$.entries[0].teams[0].teamId").value(2))
                .andExpect(jsonPath("$.entries[0].teams[0].points").value(7));
        verify(fantasyService).getFantasyClasification(4);
    }

    @Test
    void clasificationReturnsOkWithEmptyLists() throws Exception {
        when(fantasyService.getFantasyClasification(99))
                .thenReturn(new FantasyClasificationDTO(99, List.of(), List.of(), List.of(), List.of()));

        MockMvcBuilders.standaloneSetup(fantasyController).build()
                .perform(get("/fantasy/clasification").param("numberSeason", "99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$.season").value(99))
                .andExpect(jsonPath("$.races").isEmpty())
                .andExpect(jsonPath("$.drivers").isEmpty())
                .andExpect(jsonPath("$.teams").isEmpty())
                .andExpect(jsonPath("$.entries").isEmpty());
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
