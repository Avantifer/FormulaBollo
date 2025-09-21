package formula.bollo.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Sprint;
import formula.bollo.mapper.SprintMapper;
import formula.bollo.model.SprintDTO;

@Service
public class SprintImpl {
    
    private SprintMapper sprintMapper;

    public SprintImpl(SprintMapper sprintMapper) {
        this.sprintMapper = sprintMapper;
    }

    public List<Sprint> convertSprintsDTOToSprints(List<SprintDTO> sprintsDto) {
        return this.sprintMapper.convertSprintsDTOToSprints(sprintsDto);
    }

    public List<SprintDTO> convertSprintsToSprintsDTO(List<Sprint> sprints) {
        return this.sprintMapper.convertSprintsToSprintsDTO(sprints);
    }
}
