package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import formula.bollo.entity.Race;
import formula.bollo.entity.Season;
import formula.bollo.impl.RaceImpl;
import formula.bollo.impl.SeasonImpl;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.SeasonDTO;
import formula.bollo.repository.RaceRepository;
import formula.bollo.repository.SeasonRepository;

@ExtendWith(MockitoExtension.class)
class RaceServiceTest {

    @InjectMocks
    private RaceService raceService;

    @Mock
    private SeasonRepository seasonRepository;

    @Mock
    private RaceRepository raceRepository;

    @Mock
    private SeasonImpl seasonImpl;

    @Mock
    private RaceImpl raceImpl;

    @Test
    void saveRaceSeasonEmpty() {
        SeasonDTO seasonDTO = new SeasonDTO(1L, "Temporada 1", 1, "2023");
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);

        ResponseEntity<String> responseEntity = raceService.saveRace(raceDTO);

        assertEquals("Hubo un problema al guardar la carrera", responseEntity.getBody());
    }

    @Test
    void saveRaceNotExistingPreviously() {
        SeasonDTO seasonDTO = new SeasonDTO(1L, "Temporada 1", 1, "2023");
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);

        Season season = new Season(1L, "Temporada 1", 1, 2023);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        when(seasonRepository.findByNumber(anyInt())).thenReturn(season);
        when(raceRepository.findByNameAndSeason(anyString(), anyInt())).thenReturn(Optional.of(race));

        ResponseEntity<String> responseEntity = raceService.saveRace(raceDTO);

        assertEquals("La carrera se ha actualizado correctamente", responseEntity.getBody());
    }

    @Test
    void saveRace() {
        SeasonDTO seasonDTO = new SeasonDTO(1L, "Temporada 1", 1, "2023");
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);

        Season season = new Season(1L, "Temporada 1", 1, 2023);

        when(seasonRepository.findByNumber(anyInt())).thenReturn(season);

        ResponseEntity<String> responseEntity = raceService.saveRace(raceDTO);

        assertEquals("La carrera se ha creado correctamente", responseEntity.getBody());
    }
}
