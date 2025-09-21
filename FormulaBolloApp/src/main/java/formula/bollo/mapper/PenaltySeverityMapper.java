package formula.bollo.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import formula.bollo.entity.PenaltySeverity;
import formula.bollo.model.PenaltySeverityDTO;

@Mapper(componentModel = "spring")
public interface PenaltySeverityMapper {
    List<PenaltySeverityDTO> convertPenaltySeveritiesToPenaltySeverityDTO(List<PenaltySeverity> penaltySeverities);
}
