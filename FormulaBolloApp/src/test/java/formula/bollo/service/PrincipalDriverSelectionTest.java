package formula.bollo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mapstruct.factory.Mappers;

import formula.bollo.controller.DriverController;
import formula.bollo.entity.*;
import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.mapper.DriverMapper;
import formula.bollo.repository.*;

class PrincipalDriverSelectionTest {
    final ResultRepository results = mock(ResultRepository.class);
    final SprintRepository sprints = mock(SprintRepository.class);
    final PenaltyRepository penalties = mock(PenaltyRepository.class);
    final ChampionshipRepository championships = mock(ChampionshipRepository.class);
    final DriverImpl mapper = new DriverImpl(Mappers.getMapper(DriverMapper.class));
    final ResultService points = new ResultService(results, sprints, mock(ResultImpl.class), mapper);
    final DriverService service = new DriverService(results, championships, penalties, sprints,
            mapper, mock(ResultImpl.class), points);

    @ParameterizedTest
    @CsvSource({"5,8", "4,4", "0,0", "1,0"})
    void principalAndPointsAreIndependentOfDriverAndResultInsertionOrder(int kickRaces, int ferrariRaces) {
        Driver kick = driver(45, 3, "Kick Sauber");
        Driver ferrari = driver(62, 3, "Ferrari");
        Driver third = driver(63, 3, "Alpine");
        for (List<Driver> order : List.of(List.of(kick, ferrari, third), List.of(third, ferrari, kick),
                List.of(ferrari, kick, third), List.of(kick, third, ferrari))) {
            List<Result> races = races(kick, kickRaces);
            races.addAll(races(ferrari, ferrariRaces));
            Collections.reverse(races);
            when(results.findWithRaceAndPositionByDriverIds(anyList())).thenReturn(races);
            var info = service.getAllInfoDriver(order);
            assertThat(info.getDriver().getId()).isEqualTo(45);
            assertThat(info.getRacesFinished()).isEqualTo(kickRaces + ferrariRaces);
            assertThat(info.getTotalPoints()).isEqualTo(25 * (kickRaces + ferrariRaces));

            var seeded = new LinkedHashMap<formula.bollo.model.DriverDTO, Integer>();
            order.forEach(driver -> seeded.put(mapper.driverToDriverDTO(driver), 0));
            // Sprint points must be summed but must not choose the principal record.
            List<Sprint> sprintRows = List.of(new Sprint(1L, race(ferrari, 1), ferrari,
                    new SprintPosition(1L, 1, 8)));
            var ranking = points.setTotalPointsByDriver(races, sprintRows, seeded);
            assertThat(ranking).hasSize(1);
            assertThat(ranking.getFirst().getDriver().getId()).isEqualTo(45);
            assertThat(ranking.getFirst().getTotalPoints()).isEqualTo(25 * (kickRaces + ferrariRaces) + 8);
        }
    }

    @Test
    void firstRecordRemainsPrincipalWithAbandonmentsAndSprints() {
        Driver kick = driver(45, 3, "Kick Sauber");
        Driver ferrari = driver(62, 3, "Ferrari");
        List<Result> races = races(kick, 2);
        races.forEach(result -> result.setPosition(null));
        races.addAll(races(ferrari, 1));
        when(results.findWithRaceAndPositionByDriverIds(anyList())).thenReturn(races);
        when(sprints.findByDriverIds(anyList())).thenReturn(List.of(
                new Sprint(1L, race(ferrari, 1), ferrari, new SprintPosition(1L, 1, 8))));
        var info = service.getAllInfoDriver(List.of(ferrari, kick));
        assertThat(info.getDriver().getId()).isEqualTo(45);
        assertThat(info.getRacesFinished()).isEqualTo(1);
        assertThat(info.getTotalPoints()).isEqualTo(33);
        assertThat(points.setTotalPointsByDriver(races, List.of(), new LinkedHashMap<>())
                .getFirst().getDriver().getId()).isEqualTo(45);
    }

    @Test
    void infoEndpointUsesLatestSeasonForNullAndZeroAndAggregatesAllRecords() {
        Driver older = driver(1, 2, "Alpine");
        Driver kick = driver(45, 3, "Kick Sauber");
        Driver ferrari = driver(62, 3, "Ferrari");
        var repository = mock(DriverRepository.class);
        var controller = new DriverController(repository, mapper, service);
        List<Result> all = races(older, 22);
        all.addAll(races(kick, 5));
        all.addAll(races(ferrari, 8));
        when(repository.findByName("Robe")).thenReturn(List.of(ferrari, kick, older));
        when(results.findWithRaceAndPositionByDriverIds(anyList())).thenReturn(all);
        for (Integer season : new Integer[] {null, 0}) {
            var info = controller.getinfoDriverByName(season, "Robe");
            assertThat(info.getDriver().getId()).isEqualTo(45);
            assertThat(info.getTotalPoints()).isEqualTo(35 * 25);
        }
        when(repository.findByNameAndSeason(3, "Robe")).thenReturn(List.of(ferrari, kick));
        when(results.findWithRaceAndPositionByDriverIds(anyList())).thenReturn(all.subList(22, 35));
        assertThat(controller.getinfoDriverByName(3, "Robe").getDriver().getId()).isEqualTo(45);
    }

    @Test
    void singleRecordAndUnknownName() {
        Driver only = driver(1, 1, "Ferrari");
        assertThat(service.getAllInfoDriver(List.of(only)).getDriver().getId()).isEqualTo(1);
        var seeded = new LinkedHashMap<formula.bollo.model.DriverDTO, Integer>();
        seeded.put(mapper.driverToDriverDTO(only), 25);
        assertThat(points.setTotalPointsByDriver(List.of(), List.of(), seeded))
                .singleElement().satisfies(point -> {
                    assertThat(point.getDriver().getId()).isEqualTo(1);
                    assertThat(point.getTotalPoints()).isEqualTo(25);
                });
        var repository = mock(DriverRepository.class);
        var controller = new DriverController(repository, mapper, service);
        assertThat(controller.getinfoDriverByName(3, "Unknown")).isNull();
        assertThat(controller.getinfoDriverByName(0, "Unknown")).isNull();
        assertThat(service.getAllInfoDriver(List.of())).isNull();
        assertThat(service.getTeamHistory(List.of())).isEmpty();
        assertThat(points.setTotalPointsByDriver(List.of(), List.of(), new LinkedHashMap<>())).isEmpty();
    }

    @Test
    void historyOrdersSeasonsThenIdsWithoutReadingResults() {
        Driver kick = driver(45, 3, "Kick Sauber");
        Driver ferrari = driver(62, 3, "Ferrari");
        Driver older = driver(70, 2, "Alpine");
        var history = service.getTeamHistory(List.of(ferrari, older, kick));
        assertThat(history).extracting(entry -> entry.getTeam().getName())
                .containsExactly("Alpine", "Kick Sauber", "Ferrari");
        verifyNoInteractions(results);
    }

    private Driver driver(long id, int number, String team) {
        Season season = new Season((long) number, "Season " + number, number, 2023 + number);
        return new Driver(id, "Robe", 7, "driver.png", season,
                new Team(id, team, "car.png", "logo.png", season));
    }

    private Race race(Driver driver, int number) {
        return new Race((long) number, "Race " + number, "", "",
                LocalDateTime.of(2026, 1, 1, 12, 0).plusDays(number), driver.getSeason(), 1);
    }

    private List<Result> races(Driver driver, int count) {
        List<Result> rows = new ArrayList<>();
        for (int index = 1; index <= count; index++) {
            rows.add(new Result((long) index, race(driver, index), driver, new Position(1L, 1, 25), 0, 0));
        }
        return rows;
    }
}
