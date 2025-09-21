package formula.bollo.controller;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.entity.Driver;
import formula.bollo.impl.DriverImpl;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.DriverInfoDTO;
import formula.bollo.model.DriverPointsEvolutionDTO;
import formula.bollo.model.RecordDTO;
import formula.bollo.repository.DriverRepository;
import formula.bollo.service.DriverService;
import formula.bollo.utils.Constants;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping(path = { Constants.ENDPOINT_DRIVER })
@Tag(name = Constants.TAG_DRIVER, description = Constants.TAG_DRIVER_SUMMARY)
public class DriverController {

    private DriverRepository driverRepository;
    private DriverImpl driverImpl;
    private DriverService driverService;

    public DriverController(DriverRepository driverRepository, DriverImpl driverImpl, DriverService driverService) {
        this.driverRepository = driverRepository;
        this.driverImpl = driverImpl;
        this.driverService = driverService;
    }

    @Operation(summary = "Get all drivers", tags = Constants.TAG_DRIVER)
    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<DriverDTO> getAllDrivers(@RequestParam Integer season) {
        log.info("Se coge todos los pilotos de la temporada " + season);
        return this.driverImpl.convertListDriversToDriversDTO(driverRepository.findBySeason(season));
    }

    @Operation(summary = "Get drivers of a team", tags = Constants.TAG_DRIVER)
    @GetMapping(path = "/byTeamName", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<DriverDTO> getDriversByTeam(@RequestParam(required = false) Integer season,
            @RequestParam String teamName) {
        log.info("Se coge todos los pilotos del equipo " + teamName + " y la temporada " + season);
        List<Driver> drivers = (season == 0)
                ? this.driverRepository.findByTeamName(teamName)
                : this.driverRepository.findByTeamNameAndSeason(season, teamName);
        return this.driverImpl.convertListDriversToDriversDTO(drivers);
    }

    @Operation(summary = "Get info of a driver", tags = Constants.TAG_DRIVER)
    @GetMapping(path = "/infoDriverByName", produces = MediaType.APPLICATION_JSON_VALUE)
    public DriverInfoDTO getinfoDriverByName(@RequestParam(required = false) Integer season,
            @RequestParam String driverName) {
        log.info("Se coge la informacion del piloto " + driverName + "y de la temporada " + season);
        List<Driver> drivers = (season == 0) ? driverRepository.findByName(driverName)
                : driverRepository.findByNameAndSeason(season, driverName);
        return this.driverService.getAllInfoDriver(drivers);
    }

    @Operation(summary = "Get all info of drivers", tags = Constants.TAG_DRIVER)
    @GetMapping(path = "/allInfoDriver", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<DriverInfoDTO> getAllInfoDriver(@RequestParam Integer season) {
        log.info("Se coge toda la informacion de los pilotos de la temporada " + season);
        List<Driver> drivers = (season == 0) ? driverRepository.findAll() : driverRepository.findAllBySeason(season);

        List<DriverInfoDTO> driversInfoDTO = drivers.stream()
                .map(driver -> this.driverService.getAllInfoDriver(List.of(driver)))
                .toList();

        return this.driverService.sumDuplicates(driversInfoDTO);
    }

    @Operation(summary = "Get all record of drivers", tags = Constants.TAG_DRIVER)
    @GetMapping(path = "/recordsDrivers", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<RecordDTO> getAllDriversRecords() {
        log.info("Coger todos los records de los pilotos");
        return this.driverService.getAllRecords();
    }

    @Operation(summary = "Get all evolution points of drivers", tags = Constants.TAG_DRIVER)
    @GetMapping(path = "/evolutionPoints", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<DriverPointsEvolutionDTO> getEvolutionPoints(@RequestParam Integer driver1Id,
            @RequestParam Integer driver2Id,
            @RequestParam Integer driver3Id,
            @RequestParam Integer driver4Id) {
        log.info("Coger la evolucion de los pilotos " + driver1Id + ", " + driver2Id + ", " + driver3Id + ", "
                + driver4Id);
        Set<Integer> driverIds = new HashSet<>(Arrays.asList(driver1Id, driver2Id, driver3Id, driver4Id));
        return this.driverService.getAllPointsEvolutionDriver(driverIds);
    }
}
