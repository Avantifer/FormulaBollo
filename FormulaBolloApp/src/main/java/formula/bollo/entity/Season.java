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
@Table(name = "season")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Season {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, length = 2)
    private Long id;

    @Column(name = "name", unique = true, nullable = false, length = 12)
    private String name;

    @Column(name = "number", unique = true, nullable = false, length = 2)
    private int number;

    @Column(name = "year", unique = true, nullable = false, length = 4)
    private int year;
}
