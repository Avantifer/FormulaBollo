package formula.bollo.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Penalty;
import formula.bollo.mapper.PenaltyMapper;
import formula.bollo.model.PenaltyDTO;

@Service
public class PenaltyImpl {

    private PenaltyMapper penaltyMapper;

    public PenaltyImpl(PenaltyMapper penaltyMapper) {
        this.penaltyMapper = penaltyMapper;
    }

    public Penalty penaltyDTOToPenalty(PenaltyDTO penaltyDTO) {
        return this.penaltyMapper.penaltyDTOToPenalty(penaltyDTO);
    }

    public PenaltyDTO penaltyToPenaltyDTO(Penalty penalty) {
        return this.penaltyMapper.penaltyToPenaltyDTO(penalty);
    }

    public List<PenaltyDTO> convertPenaltiesToPenaltiesDTO(List<Penalty> penalties) {
        return this.penaltyMapper.convertPenaltiesToPenaltiesDTO(penalties);
    }
}
