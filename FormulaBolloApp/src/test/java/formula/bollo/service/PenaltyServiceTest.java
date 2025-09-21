package formula.bollo.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Arrays;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
        penaltyService.savePenalties(Arrays.asList(penaltyDTO));

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
        penaltyService.savePenalties(Arrays.asList(penaltyDTO));

        verify(penaltyRepository, times(1)).save(any());
    }
}
