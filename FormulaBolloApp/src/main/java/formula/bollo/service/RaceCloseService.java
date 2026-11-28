package formula.bollo.service;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.model.RaceCloseDTO;
import formula.bollo.model.RaceDTO;
import formula.bollo.repository.RaceRepository;
import formula.bollo.utils.Constants;
import formula.bollo.utils.ResultBatchValidator;
import jakarta.persistence.EntityManager;

@Service
public class RaceCloseService {
    private final ResultService resultService;
    private final RaceService raceService;
    private final FantasyService fantasyService;
    private final RaceRepository raceRepository;
    private final EntityManager entityManager;

    public RaceCloseService(ResultService resultService, RaceService raceService, FantasyService fantasyService,
            RaceRepository raceRepository, EntityManager entityManager) {
        this.resultService = resultService;
        this.raceService = raceService;
        this.fantasyService = fantasyService;
        this.raceRepository = raceRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public ResponseEntity<String> closeRace(RaceCloseDTO request) {
        RaceDTO race = request.race();
        if (race == null || race.getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes indicar la carrera");
        }
        if (!ResultBatchValidator.isValidResults(request.results())
                || request.results().stream().anyMatch(result -> !race.getId().equals(result.getRace().getId()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El lote de resultados no es valido");
        }
        if (!raceRepository.existsById(race.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se ha encontrado la carrera");
        }

        completeStep(resultService.saveResults(request.results()));
        race.setFinished(1);
        completeStep(raceService.saveRace(race));
        completeStep(fantasyService.saveDriverTeamPoints(race.getId().intValue()));
        completeStep(fantasyService.saveDriverTeamPrices(race.getId().intValue()));
        return new ResponseEntity<>("Carrera cerrada correctamente", Constants.HEADERS_TEXT_PLAIN, HttpStatus.OK);
    }

    private void completeStep(ResponseEntity<String> response) {
        if (!response.getStatusCode().is2xxSuccessful()) {
            // Returned errors must leave the transaction through the same rollback path as thrown errors.
            throw new ResponseStatusException(response.getStatusCode(), response.getBody());
        }
        // Each legacy HTTP request read fresh database fields, including position points and driver teams.
        entityManager.flush();
        entityManager.clear();
    }
}
