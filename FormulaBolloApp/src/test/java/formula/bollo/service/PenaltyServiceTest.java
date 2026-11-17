package formula.bollo.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.inOrder;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.entity.Driver;
import formula.bollo.entity.Penalty;
import formula.bollo.entity.PenaltySeverity;
import formula.bollo.entity.Race;
import formula.bollo.entity.Season;
import formula.bollo.entity.Team;
import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.PenaltyImpl;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.PenaltyDTO;
import formula.bollo.model.PenaltySeverityDTO;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.SeasonDTO;
import formula.bollo.model.TeamDTO;
import formula.bollo.repository.PenaltyRepository;

@ExtendWith(MockitoExtension.class)
class PenaltyServiceTest {

    @InjectMocks
    private PenaltyService penaltyService;

    @Mock
    private PenaltyRepository penaltyRepository;

    @Mock
    private PenaltyImpl penaltyImpl;

    @Mock
    private DriverImpl driverImpl;

    @Test
    void savePenaltiesNoReason() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);
        PenaltySeverityDTO penaltySeverityDTO = new PenaltySeverityDTO(1L, "Leve");
        PenaltyDTO penaltyDTO = new PenaltyDTO(1L, raceDTO, driverDTO, "Razon", penaltySeverityDTO, seasonDTO);

        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        PenaltySeverity penaltySeverity = new PenaltySeverity(1L, "Leve");
        Penalty penalty = new Penalty(1L, race, driver, "", penaltySeverity, season);

        when(penaltyImpl.penaltyDTOToPenalty(any())).thenReturn(penalty);
        penaltyService.savePenalties(Arrays.asList(penaltyDTO), 1, 1);

        verify(penaltyRepository, times(0)).save(any());
    }

    @Test
    void savePenalties() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);
        PenaltySeverityDTO penaltySeverityDTO = new PenaltySeverityDTO(1L, "Leve");
        PenaltyDTO penaltyDTO = new PenaltyDTO(1L, raceDTO, driverDTO, "Razon", penaltySeverityDTO, seasonDTO);

        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        PenaltySeverity penaltySeverity = new PenaltySeverity(1L, "Leve");
        Penalty penalty = new Penalty(1L, race, driver, "Razon", penaltySeverity, season);

        when(penaltyImpl.penaltyDTOToPenalty(any())).thenReturn(penalty);
        penaltyService.savePenalties(Arrays.asList(penaltyDTO), 1, 1);

        verify(penaltyRepository, times(1)).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"reason", "race", "driver", "severity", "season"})
    void invalidSecondPenaltyDoesNotDeleteOrSaveAnything(String missing) {
        PenaltyDTO valid = penaltyDTO();
        PenaltyDTO invalid = penaltyDTO();
        switch (missing) {
            case "reason" -> invalid.setReason(null);
            case "race" -> invalid.setRace(null);
            case "driver" -> invalid.setDriver(null);
            case "severity" -> invalid.setPenaltySeverity(null);
            case "season" -> invalid.setSeason(null);
        }
        when(penaltyImpl.penaltyDTOToPenalty(valid)).thenReturn(penalty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> penaltyService.savePenalties(List.of(valid, invalid), 1, 1));

        assertEquals(400, error.getStatusCode().value());
        verifyNoInteractions(penaltyRepository);
    }

    @Test
    void replacementDeletesAndSavesInServiceAfterValidation() throws Exception {
        PenaltyDTO input = penaltyDTO();
        input.setId(13L);
        Penalty saved = penalty();
        saved.setId(13L);
        Penalty previous = penalty();
        when(penaltyImpl.penaltyDTOToPenalty(input)).thenReturn(saved);
        when(penaltyRepository.findByDriverAndRaceAndSeverity(1, 1, 1, 2)).thenReturn(List.of(previous));

        penaltyService.savePenalties(List.of(input), 1, 1);

        var order = inOrder(penaltyRepository);
        order.verify(penaltyRepository).deleteAll(List.of(previous));
        order.verify(penaltyRepository).save(saved);
        ArgumentCaptor<Penalty> inserted = ArgumentCaptor.forClass(Penalty.class);
        verify(penaltyRepository).save(inserted.capture());
        assertNull(inserted.getValue().getId());
        assertNotNull(PenaltyService.class.getMethod("savePenalties", List.class, int.class, int.class)
                .getAnnotation(Transactional.class));
    }

    @Test
    void emptyReplacementClearsRequestedDriverAndRace() {
        Penalty previous = penalty();
        when(penaltyRepository.findByDriverAndRace(1, 1)).thenReturn(List.of(previous));

        penaltyService.savePenalties(List.of(), 1, 1);

        verify(penaltyRepository).deleteAll(List.of(previous));
    }

    @Test
    void mismatchedRequestScopeDoesNotDeleteAnything() {
        PenaltyDTO input = penaltyDTO();
        when(penaltyImpl.penaltyDTOToPenalty(input)).thenReturn(penalty());

        assertThrows(ResponseStatusException.class,
                () -> penaltyService.savePenalties(List.of(input), 9, 1));

        verifyNoInteractions(penaltyRepository);
    }

    private PenaltyDTO penaltyDTO() {
        SeasonDTO season = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO team = new TeamDTO(1L, "Haas", "", "", season);
        return new PenaltyDTO(0L,
                new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), season, 0),
                new DriverDTO(1L, "Avantifer", 2, "", season, team),
                "Razon", new PenaltySeverityDTO(1L, "Leve"), season);
    }

    private Penalty penalty() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        return new Penalty(0L,
                new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0),
                new Driver(1L, "Avantifer", 2, "", season, team),
                "Razon", new PenaltySeverity(1L, "Leve"), season);
    }
}
