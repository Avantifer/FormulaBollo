package formula.bollo.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import formula.bollo.entity.Penalty;
import formula.bollo.model.PenaltyDTO;

@Mapper(componentModel = "spring")
public interface PenaltyMapper {
    Penalty penaltyDTOToPenalty(PenaltyDTO penaltyDTO);

    PenaltyDTO penaltyToPenaltyDTO(Penalty penalty);

    List<PenaltyDTO> convertPenaltiesToPenaltiesDTO(List<Penalty> penalties);
}
