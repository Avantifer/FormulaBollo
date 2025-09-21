package formula.bollo.service;

import java.util.Optional;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import formula.bollo.entity.Race;
import formula.bollo.entity.Season;
import formula.bollo.impl.RaceImpl;
import formula.bollo.impl.SeasonImpl;
import formula.bollo.model.RaceDTO;
import formula.bollo.repository.RaceRepository;
import formula.bollo.repository.SeasonRepository;
import formula.bollo.utils.Constants;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class RaceService {

    private SeasonRepository seasonRepository;
    private RaceRepository raceRepository;

    private SeasonImpl seasonImpl;
    private RaceImpl raceImpl;

    public RaceService(SeasonRepository seasonRepository, RaceRepository raceRepository, SeasonImpl seasonImpl,
            RaceImpl raceImpl) {
        this.seasonRepository = seasonRepository;
        this.raceRepository = raceRepository;
        this.seasonImpl = seasonImpl;
        this.raceImpl = raceImpl;
    }

    /**
     * Saves or updates a race based on the provided RaceDTO.
     *
     * @param raceDTO The RaceDTO containing race information to be saved or
     *                updated.
     */
    public ResponseEntity<String> saveRace(RaceDTO raceDTO) {
        Season season = this.seasonRepository.findByNumber(raceDTO.getSeason().getNumber());

        if (season == null) {
            log.info("Hubo un problema al guardar con la carrera porque la temporada es null");
            return new ResponseEntity<>("Hubo un problema al guardar la carrera", Constants.HEADERS_TEXT_PLAIN,
                    HttpStatusCode.valueOf(500));
        }

        Optional<Race> existingRace = this.raceRepository.findByNameAndSeason(raceDTO.getName(),
                raceDTO.getSeason().getNumber());

        if (existingRace.isPresent()) {
            Race raceToUpdate = existingRace.get();
            raceToUpdate.setName(raceDTO.getName());
            raceToUpdate.setFlagImage(raceDTO.getFlagImage());
            raceToUpdate.setCircuitImage(raceDTO.getCircuitImage());
            raceToUpdate.setDateStart(raceDTO.getDateStart());
            raceToUpdate.setSeason(this.seasonImpl.seasonDTOToSeason(raceDTO.getSeason()));
            raceToUpdate.setFinished(raceDTO.getFinished());
            this.raceRepository.save(raceToUpdate);

            return new ResponseEntity<>("La carrera se ha actualizado correctamente", HttpStatusCode.valueOf(200));
        } else {
            Race raceToSave = this.raceImpl.raceDTOToRace(raceDTO);
            this.raceRepository.save(raceToSave);

            return new ResponseEntity<>("La carrera se ha creado correctamente", HttpStatusCode.valueOf(200));
        }
    }
}
