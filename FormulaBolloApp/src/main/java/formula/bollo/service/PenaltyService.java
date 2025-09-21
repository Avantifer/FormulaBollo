package formula.bollo.service;

import java.util.List;

import org.springframework.stereotype.Service;

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

    /**
     * Saves penalties from a list of PenaltyDTO objects to a repository.
     *
     * @param penaltyDTOs The list of PenaltyDTO objects to be saved.
     */
    public void savePenalties(List<PenaltyDTO> penaltyDTOs) {
        penaltyDTOs.stream()
                .map(penaltyImpl::penaltyDTOToPenalty)
                .filter(penalty -> !penalty.getReason().isEmpty())
                .forEach(penalty -> {
                    if (penalty.getId() != null && penalty.getId() == 0L) {
                        penalty.setId(null);
                    }
                    penaltyRepository.save(penalty);
                });
    }
}
