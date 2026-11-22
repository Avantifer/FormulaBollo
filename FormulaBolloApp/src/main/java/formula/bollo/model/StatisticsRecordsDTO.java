package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatisticsRecordsDTO {
    private List<RecordSeasonDTO> seasons;
    private List<RecordBoardDTO> driverRecords;
    private List<RecordBoardDTO> teamRecords;
    private List<RecordHolderCountDTO> holderCounts;
    private VictoryProgressDTO victoryProgress;
}
