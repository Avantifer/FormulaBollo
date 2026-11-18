package formula.bollo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "configuration")
@Data
public class Configuration {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, length = 2)
    private Long id;

    @Column(name = "setting", nullable = false, length = 50, unique = true)
    private String setting;

    @Column(name = "setting_value", length = 50)
    private String settingValue;
}
