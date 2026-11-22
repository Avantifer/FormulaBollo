package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecordBoardDTO {
    private String key;
    private String title;
    private boolean percent;
    private boolean negative;
    private Number value;
    private List<RecordEntryDTO> holders;
    private List<RecordEntryDTO> ranking;
}
