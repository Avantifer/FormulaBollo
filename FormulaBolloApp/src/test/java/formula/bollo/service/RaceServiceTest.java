package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> raceService.saveRace(raceDTO));

        assertEquals(400, error.getStatusCode().value());
        assertEquals("No existe la temporada 1", error.getReason());
        verifyNoInteractions(raceRepository, raceImpl, seasonImpl);
    }

    @Test
    void saveRaceNotExistingPreviously() {
        SeasonDTO seasonDTO = new SeasonDTO(1L, "Nombre manipulado", 1, "2099");
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);

        Season season = new Season(1L, "Temporada 1", 1, 2023);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        when(seasonRepository.findByNumber(anyInt())).thenReturn(season);
        when(raceRepository.findByNameAndSeason(anyString(), anyInt())).thenReturn(Optional.of(race));

        ResponseEntity<String> responseEntity = raceService.saveRace(raceDTO);

        assertEquals("La carrera se ha actualizado correctamente", responseEntity.getBody());
        assertSame(season, race.getSeason());
        assertEquals("Temporada 1", race.getSeason().getName());
        assertEquals(2023, race.getSeason().getYear());
        verify(raceRepository).save(race);
        verifyNoInteractions(seasonImpl);
    }

    @Test
    void saveRace() {
        SeasonDTO seasonDTO = new SeasonDTO(1L, "Temporada 1", 1, "2023");
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);

        Season season = new Season(1L, "Temporada 1", 1, 2023);

        when(seasonRepository.findByNumber(anyInt())).thenReturn(season);
        Race mappedRace = new Race();
        when(raceImpl.raceDTOToRace(raceDTO)).thenReturn(mappedRace);

        ResponseEntity<String> responseEntity = raceService.saveRace(raceDTO);

        assertEquals("La carrera se ha creado correctamente", responseEntity.getBody());
        assertSame(season, mappedRace.getSeason());
        verify(raceRepository).save(mappedRace);
    }

    @Test
    void missingSeasonReturnsBadRequestWithoutSaving() {
        RaceDTO input = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), null, 0);

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> raceService.saveRace(input));

        assertEquals(400, error.getStatusCode().value());
        verifyNoInteractions(seasonRepository, raceRepository, raceImpl, seasonImpl);
    }

    @Test
    void missingOrBlankNameReturnsBadRequestWithoutSaving() {
        RaceDTO input = new RaceDTO(1L, null, "", "", LocalDateTime.now(),
                new SeasonDTO(1L, "Temporada 1", 1, "2023"), 0);
        for (String name : new String[] {null, "", "   "}) {
            input.setName(name);
            ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> raceService.saveRace(input));
            assertEquals(400, error.getStatusCode().value());
        }
        verifyNoInteractions(seasonRepository, raceRepository, raceImpl, seasonImpl);
    }

    @Test
    void savingRaceIsTransactional() throws Exception {
        assertNotNull(RaceService.class.getMethod("saveRace", RaceDTO.class).getAnnotation(Transactional.class));
    }
}
