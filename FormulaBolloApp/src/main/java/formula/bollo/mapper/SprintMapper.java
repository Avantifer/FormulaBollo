package formula.bollo.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import formula.bollo.entity.Sprint;
import formula.bollo.model.SprintDTO;

@Mapper(componentModel = "spring")
public interface SprintMapper {
    List<Sprint> convertSprintsDTOToSprints(List<SprintDTO> sprintsDto);

    List<SprintDTO> convertSprintsToSprintsDTO(List<Sprint> sprints);
}
