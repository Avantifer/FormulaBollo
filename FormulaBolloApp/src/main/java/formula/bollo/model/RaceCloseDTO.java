package formula.bollo.model;

import java.util.List;

public record RaceCloseDTO(RaceDTO race, List<ResultDTO> results) { }
