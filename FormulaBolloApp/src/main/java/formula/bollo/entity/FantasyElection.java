package formula.bollo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "fantasy_election")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FantasyElection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, length = 10)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_one_id")
    private Driver driverOne;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_two_id")
    private Driver driverTwo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_three_id")
    private Driver driverThree;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_one_id")
    private Team teamOne;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_two_id")
    private Team teamTwo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "race_id")
    private Race race;
}
