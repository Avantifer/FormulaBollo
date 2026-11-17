package formula.bollo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "Cache")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Cache {

    @Id
    @Column(name = "name", nullable = false, length = 20)
    private String name;

    @Column(name = "version", nullable = false, length = 6)
    private Integer version;
}
