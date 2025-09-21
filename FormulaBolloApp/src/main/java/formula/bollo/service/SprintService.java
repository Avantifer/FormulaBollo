package formula.bollo.service;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import formula.bollo.entity.Sprint;
import formula.bollo.impl.SprintImpl;
import formula.bollo.model.SprintDTO;
import formula.bollo.repository.SprintRepository;
import formula.bollo.utils.Constants;

@Service
public class SprintService {

    private SprintRepository sprintRepository;
    private SprintImpl sprintImpl;

    public SprintService(SprintRepository sprintRepository, SprintImpl sprintImpl) {
        this.sprintRepository = sprintRepository;
        this.sprintImpl = sprintImpl;
    }

    /**
     * Orders a list of SprintDTO objects by their positions (if available).
     *
     * @param sprintDTOs The list of SprintDTO objects to be ordered.
     */
    public List<SprintDTO> orderSprintsByPoints(List<SprintDTO> sprintDTOs) {
        Comparator<SprintDTO> pointsComparator = Comparator
                .comparing(sprint -> sprint.getPosition() != null ? sprint.getPosition().getPositionNumber() : null,
                        Comparator.nullsLast(Integer::compareTo));
        Collections.sort(sprintDTOs, pointsComparator);
        return sprintDTOs;
    }

    /**
     * Saves a list of SprintDTO objects to the repository.
     *
     * @param sprintDTOs The list of SprintDTO objects to be saved.
     */
    public ResponseEntity<String> saveSprints(List<SprintDTO> sprintDTOs) {
        List<Sprint> existingSprints = this.sprintRepository
                .findByRaceId(sprintDTOs.get(0).getRace().getId().intValue());

        if (!existingSprints.isEmpty()) {
            sprintRepository.deleteAll(existingSprints);
        }

        sprintRepository.saveAll(this.sprintImpl.convertSprintsDTOToSprints(sprintDTOs));

        return new ResponseEntity<>("Resultados de la sprint guardados correctamente", Constants.HEADERS_TEXT_PLAIN,
                HttpStatusCode.valueOf(200));
    }

    public ResponseEntity<String> deleteSprints(Integer raceId) {
        sprintRepository.deleteByRaceId(raceId);

        return new ResponseEntity<>("Resultados de la sprint borrados correctamente", Constants.HEADERS_TEXT_PLAIN,
                HttpStatusCode.valueOf(200));
    }
}
