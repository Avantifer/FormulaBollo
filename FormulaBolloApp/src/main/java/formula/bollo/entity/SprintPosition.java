package formula.bollo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sprint_position")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SprintPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, length = 2)
    private Long id;

    @Column(name = "position_number", nullable = false, length = 2)
    private int positionNumber;

    @Column(name = "points", nullable = false, length = 2)
    private int points;
}