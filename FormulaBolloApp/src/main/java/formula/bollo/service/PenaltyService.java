package formula.bollo.service;

import formula.bollo.utils.Constants;
import org.springframework.cache.annotation.CacheEvict;

import java.util.List;
import java.util.ArrayList;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.entity.Penalty;
import formula.bollo.impl.PenaltyImpl;
import formula.bollo.model.PenaltyDTO;
import formula.bollo.repository.PenaltyRepository;

@Service
public class PenaltyService {

    private PenaltyRepository penaltyRepository;

    private PenaltyImpl penaltyImpl;

    public PenaltyService(PenaltyRepository penaltyRepository, PenaltyImpl penaltyImpl) {
        this.penaltyRepository = penaltyRepository;
        this.penaltyImpl = penaltyImpl;
    }

    @CacheEvict(cacheNames = Constants.CACHE_STATS, allEntries = true)
    @Transactional
    public void savePenalties(List<PenaltyDTO> penaltyDTOs, int driverId, int raceId, int severityId) {
        if (penaltyDTOs == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Las penalizaciones son obligatorias");
        }
        List<Penalty> penalties = preparePenalties(penaltyDTOs);
        if (penaltyDTOs.isEmpty()) {
            penaltyRepository.deleteAll(penaltyRepository.findByDriverAndRaceAndSeverity(driverId, raceId, severityId));
            return;
        }
        for (Penalty penalty : penalties) {
            if (penalty.getDriver().getId() != driverId || penalty.getRace().getId() != raceId
                    || penalty.getPenaltySeverity().getId() != severityId) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Piloto, carrera o severidad incoherentes");
            }
        }
        if (!penalties.isEmpty()) {
            replacePenalties(penalties);
        }
    }

    private List<Penalty> preparePenalties(List<PenaltyDTO> penaltyDTOs) {
        if (penaltyDTOs == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Las penalizaciones son obligatorias");
        }
        List<Penalty> penalties = new ArrayList<>();
        Penalty first = null;
        for (PenaltyDTO dto : penaltyDTOs) {
            if (dto == null || dto.getReason() == null || dto.getReason().length() > 250
                    || dto.getRace() == null || dto.getRace().getId() == null
                    || dto.getDriver() == null || dto.getDriver().getId() == null
                    || dto.getPenaltySeverity() == null || dto.getPenaltySeverity().getId() == null
                    || dto.getSeason() == null || dto.getSeason().getId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Penalizacion incompleta");
            }
            Penalty penalty = penaltyImpl.penaltyDTOToPenalty(dto);
            if (penalty == null || penalty.getReason() == null || penalty.getRace() == null
                    || penalty.getRace().getId() == null || penalty.getDriver() == null
                    || penalty.getDriver().getId() == null || penalty.getPenaltySeverity() == null
                    || penalty.getPenaltySeverity().getId() == null || penalty.getSeason() == null
                    || penalty.getSeason().getId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Penalizacion incompleta");
            }
            if (first == null) {
                first = penalty;
            } else if (!Objects.equals(first.getRace().getId(), penalty.getRace().getId())
                    || !Objects.equals(first.getDriver().getId(), penalty.getDriver().getId())
                    || !Objects.equals(first.getPenaltySeverity().getId(), penalty.getPenaltySeverity().getId())
                    || !Objects.equals(first.getSeason().getId(), penalty.getSeason().getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Penalizaciones de distintos grupos");
            }
            penalty.setId(null);
            penalties.add(penalty);
        }
        return penalties;
    }

    private void replacePenalties(List<Penalty> penalties) {
        Penalty first = penalties.getFirst();
        List<Penalty> previous = penaltyRepository.findByDriverAndRaceAndSeverity(
                first.getDriver().getId().intValue(), first.getRace().getId().intValue(),
                first.getPenaltySeverity().getId().intValue(), first.getSeason().getNumber());
        penaltyRepository.deleteAll(previous);
        penalties.stream().filter(penalty -> !penalty.getReason().isEmpty()).forEach(penaltyRepository::save);
    }
}
