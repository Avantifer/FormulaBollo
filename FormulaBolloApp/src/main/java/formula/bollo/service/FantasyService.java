package formula.bollo.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import formula.bollo.entity.FantasyElection;
import formula.bollo.entity.FantasyPointsDriver;
import formula.bollo.entity.FantasyPointsTeam;
import formula.bollo.entity.FantasyPriceDriver;
import formula.bollo.entity.FantasyPriceTeam;
import formula.bollo.entity.Race;
import formula.bollo.entity.Result;
import formula.bollo.impl.AccountImpl;
import formula.bollo.impl.FantasyElectionImpl;
import formula.bollo.impl.FantasyPriceImpl;
import formula.bollo.impl.RaceImpl;
import formula.bollo.model.AccountDTO;
import formula.bollo.model.FantasyElectionDTO;
import formula.bollo.model.FantasyInfoDTO;
import formula.bollo.model.FantasyPointsAccountDTO;
import formula.bollo.model.FantasyPriceDriverDTO;
import formula.bollo.model.FantasyPriceTeamDTO;
import formula.bollo.model.RaceDTO;
import formula.bollo.repository.FantasyElectionRepository;
import formula.bollo.repository.FantasyPointsDriverRepository;
import formula.bollo.repository.FantasyPointsTeamRepository;
import formula.bollo.repository.FantasyPriceDriverRepository;
import formula.bollo.repository.FantasyPriceTeamRepository;
import formula.bollo.repository.RaceRepository;
import formula.bollo.repository.ResultRepository;
import formula.bollo.utils.Constants;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class FantasyService {
    private RaceRepository raceRepository;
    private ResultRepository resultRepository;
    private FantasyElectionRepository fantasyElectionRepository;
    private FantasyPriceDriverRepository fantasyPriceDriverRepository;
    private FantasyPriceTeamRepository fantasyPriceTeamRepository;
    private FantasyPointsDriverRepository fantasyPointsDriverRepository;
    private FantasyPointsTeamRepository fantasyPointsTeamRepository;

    private FantasyElectionImpl fantasyElectionImpl;
    private FantasyPriceImpl fantasyPriceImpl;
    private AccountImpl accountImpl;
    private RaceImpl raceImpl;

    public FantasyService(
            RaceRepository raceRepository,
            ResultRepository resultRepository,
            FantasyElectionRepository fantasyElectionRepository,
            FantasyPriceDriverRepository fantasyPriceDriverRepository,
            FantasyPriceTeamRepository fantasyPriceTeamRepository,
            FantasyPointsDriverRepository fantasyPointsDriverRepository,
            FantasyPointsTeamRepository fantasyPointsTeamRepository,
            FantasyElectionImpl fantasyElectionImpl,
            FantasyPriceImpl fantasyPriceImpl,
            AccountImpl accountImpl,
            RaceImpl raceImpl) {
        this.raceRepository = raceRepository;
        this.resultRepository = resultRepository;
        this.fantasyElectionRepository = fantasyElectionRepository;
        this.fantasyPriceDriverRepository = fantasyPriceDriverRepository;
        this.fantasyPriceTeamRepository = fantasyPriceTeamRepository;
        this.fantasyPointsDriverRepository = fantasyPointsDriverRepository;
        this.fantasyPointsTeamRepository = fantasyPointsTeamRepository;
        this.fantasyElectionImpl = fantasyElectionImpl;
        this.fantasyPriceImpl = fantasyPriceImpl;
        this.accountImpl = accountImpl;
        this.raceImpl = raceImpl;
    }

    /**
     * Saves the fantasy points for both drivers and teams for a given race.
     *
     * @param raceId the ID of the race for which points need to be saved
     * @return a ResponseEntity containing a success message or error message.
     */
    public ResponseEntity<String> saveDriverTeamPoints(int raceId) {
        List<Result> results = this.resultRepository.findByRaceId(raceId);
        List<FantasyPointsDriver> fantasyDriversPrevious = this.fantasyPointsDriverRepository.findByRaceId(raceId);

        List<FantasyPointsDriver> fantasyPointsDriver = this.createDriversPoints(results);

        if (fantasyPointsDriver.isEmpty()) {
            log.error("Hubo un problema con los puntos");
            return new ResponseEntity<>("Hubo un problema con los puntos. Contacte con el administrador",
                    Constants.HEADERS_TEXT_PLAIN, HttpStatusCode.valueOf(500));
        }

        fantasyPointsDriverRepository.deleteAll(fantasyDriversPrevious);
        fantasyPointsDriverRepository.saveAll(fantasyPointsDriver);

        List<FantasyPointsTeam> fantasyPointsTeams = this.createTeamsPoints(fantasyPointsDriver);
        List<FantasyPointsTeam> fantasyTeamsPrevious = this.fantasyPointsTeamRepository.findByRaceId(raceId);

        fantasyPointsTeamRepository.deleteAll(fantasyTeamsPrevious);
        fantasyPointsTeamRepository.saveAll(fantasyPointsTeams);

        return new ResponseEntity<>("Puntos guardados correctamente", Constants.HEADERS_TEXT_PLAIN,
                HttpStatusCode.valueOf(200));
    }

    /**
     * Saves the fantasy prices for both drivers and teams for the next race based
     * on the current race results.
     *
     * @param raceId the ID of the current race to use for price calculations
     * @return a ResponseEntity containing a success message or error message.
     */
    public ResponseEntity<String> saveDriverTeamPrices(int raceId) {
        List<Result> results = this.resultRepository.findByRaceId(raceId);
        Optional<Race> nextRace = this.raceRepository.findById((long) (raceId + 1));

        if (!nextRace.isPresent()) {
            log.error("No se ha encontrado la siguiente carrera");
            return new ResponseEntity<>("No se ha encontrado la siguiente carrera", Constants.HEADERS_TEXT_PLAIN,
                    HttpStatusCode.valueOf(404));
        }

        List<FantasyPriceDriver> fantasyDriversPrevious = this.fantasyPriceDriverRepository.findByRaceId(raceId + 1);
        List<FantasyPriceDriver> fantasyPricesDriver = this.createDriversPrices(results, nextRace.get());
        if (fantasyPricesDriver.isEmpty()) {
            log.error("Hubo un problema con los precios");
            return new ResponseEntity<>("Hubo un problema con los precios. Contacte con el administrador",
                    Constants.HEADERS_TEXT_PLAIN, HttpStatusCode.valueOf(500));
        }

        fantasyPriceDriverRepository.deleteAll(fantasyDriversPrevious);
        fantasyPriceDriverRepository.saveAll(fantasyPricesDriver);

        List<FantasyPriceTeam> fantasyTeamPrevious = this.fantasyPriceTeamRepository.findByRaceId(raceId + 1);
        List<FantasyPriceTeam> fantasyPricesTeam = this.createTeamsPrices(fantasyPricesDriver, nextRace.get());

        fantasyPriceTeamRepository.deleteAll(fantasyTeamPrevious);
        fantasyPriceTeamRepository.saveAll(fantasyPricesTeam);

        return new ResponseEntity<>("Precios guardados correctamente", Constants.HEADERS_TEXT_PLAIN,
                HttpStatusCode.valueOf(200));
    }

    /**
     * Saves the user's fantasy election for a specific race and season.
     *
     * @param fantasyElectionDTO the DTO containing the details of the user's
     *                           fantasy election
     * @return a ResponseEntity containing a success message if the election is
     *         saved correctly
     */
    public ResponseEntity<String> saveFantasyElection(FantasyElectionDTO fantasyElectionDTO) {
        FantasyElection fantasyElection = this.fantasyElectionImpl
                .fantasyElectionDTOToFantasyElection(fantasyElectionDTO);
        Optional<FantasyElection> fantasyElectionPrevious = this.fantasyElectionRepository.findByUserIdAndRaceId(
                fantasyElectionDTO.getAccount().getId().intValue(),
                fantasyElectionDTO.getRace().getId().intValue());

        if (fantasyElectionPrevious.isPresent()) {
            fantasyElection.setId(fantasyElectionPrevious.get().getId());
            this.fantasyElectionRepository.save(fantasyElection);
        } else {
            this.fantasyElectionRepository.save(fantasyElection);
        }

        return new ResponseEntity<>("Tu equipo ha sido guardado correctamente", Constants.HEADERS_TEXT_PLAIN,
                HttpStatusCode.valueOf(200));
    }

    /**
     * Creates a list of FantasyPointsDriver objects based on the provided list of
     * Result objects.
     * 
     * @param results A list of Result objects containing race and driver
     *                information.
     * @return A list of FantasyPointsDriver objects with calculated fantasy points
     *         for each driver in the results.
     */
    public List<FantasyPointsDriver> createDriversPoints(List<Result> results) {
        List<FantasyPointsDriver> fantasyPoints = new ArrayList<>();
        int sizeResults = results.stream().filter(result -> result.getPosition() != null).toList().size();
        boolean pointsProblem = false;

        for (Result result : results) {
            FantasyPointsDriver fantasyPoint = new FantasyPointsDriver();
            fantasyPoint.setDriver(result.getDriver());
            fantasyPoint.setRace(result.getRace());
            fantasyPoint.setPoints(this.calculatePoints(result, sizeResults));
            if (fantasyPoint.getPoints() == -1)
                pointsProblem = true;
            fantasyPoints.add(fantasyPoint);
        }

        if (pointsProblem)
            return new ArrayList<>();

        return fantasyPoints;
    }

    /**
     * Calculates the points for a driver based on the given result.
     *
     * @param result      The result of the race.
     * @param resultsSize The total number of results in the race.
     * @return The calculated points for the fantasy race.
     */
    public int calculatePoints(Result result, int resultsSize) {
        int points = 0;

        // Get the pole position gives 3 points
        if (result.getPole() == 1)
            points += 3;

        if (result.getPosition() == null)
            return points;

        // Get the fastest lap gives 1 point
        if (result.getFastlap() == 1)
            points += 1;

        boolean goodPosition = false;

        // Depends on the position gives points
        int positionNumber = result.getPosition().getPositionNumber();
        if (positionNumber >= 1 && positionNumber <= 10) {
            points += 11 - positionNumber;
            goodPosition = true;
        }

        List<FantasyPriceDriver> fantasyPrices = this.fantasyPriceDriverRepository
                .findByRaceId(result.getRace().getId().intValue());

        FantasyPriceDriver fantasyPrice = fantasyPrices.stream()
                .filter(fp -> fp.getDriver().getId().equals(result.getDriver().getId()))
                .findFirst()
                .orElse(null);

        if (fantasyPrice == null)
            return -1;

        int priceDriver = fantasyPrice.getPrice();

        // Get the driver with the lowest price (< 10) gives 8 points
        if (priceDriver < 10 && goodPosition)
            points += 8;

        // Get the medium drivers (between 20 and 10) gives 3 points
        if (priceDriver <= 20 && priceDriver >= 10 && goodPosition)
            points += 3;

        // Depends on the number of drivers finished the race gives points
        double multiplier = (resultsSize / 10.0) < 1 ? 1.2 : (resultsSize / 8.0);
        double pointsNotExact = points * multiplier;
        points = (int) Math.ceil(pointsNotExact);

        return points;
    }

    /**
     * Creates a list of FantasyPointsTeam objects based on the provided list of
     * FantasyPointsDriver objects.
     * 
     * @param driversPoints A list of FantasyPointsDriver objects containing
     *                      driver-specific fantasy points.
     * @return A list of FantasyPointsTeam objects with calculated total fantasy
     *         points for each team.
     */
    public List<FantasyPointsTeam> createTeamsPoints(List<FantasyPointsDriver> driversPoints) {
        Race race = driversPoints.get(0).getRace();

        return driversPoints.stream()
                .collect(Collectors.groupingBy(
                        fantasyPointsDriverDTO -> fantasyPointsDriverDTO.getDriver().getTeam()))
                .entrySet()
                .stream()
                .map(entry -> {
                    List<FantasyPointsDriver> drivers = entry.getValue()
                            .stream()
                            .sorted(Comparator.comparingDouble(
                                    (FantasyPointsDriver driver) -> Objects.requireNonNullElse(driver.getPoints(), 0))
                                    .reversed())
                            .toList();

                    double maxPoints = drivers.get(0).getPoints();
                    double secondMaxPoints = drivers.size() > 1
                            ? Objects.requireNonNullElse(drivers.get(1).getPoints(), 0)
                            : 0;
                    double combinedPoints = 0.7 * maxPoints + 0.3 * secondMaxPoints;

                    FantasyPointsTeam fantasyPointsTeam = new FantasyPointsTeam();
                    fantasyPointsTeam.setTeam(entry.getKey());
                    fantasyPointsTeam.setPoints((int) Math.round(combinedPoints));
                    fantasyPointsTeam.setRace(race);

                    return fantasyPointsTeam;
                })
                .sorted(Comparator.comparingInt(FantasyPointsTeam::getPoints).reversed())
                .toList();
    }

    /**
     * Creates a list of FantasyPriceDriver objects based on the provided list of
     * race results and the next race.
     * 
     * @param results  A list of Result objects containing race and driver
     *                 information.
     * @param nextRace The next race for which the prices are being calculated.
     * @return A list of FantasyPriceDriver objects with calculated prices for each
     *         driver in the results.
     */
    public List<FantasyPriceDriver> createDriversPrices(List<Result> results, Race nextRace) {
        List<FantasyPriceDriver> fantasydriverPrices = new ArrayList<>();

        boolean pricesProblem = false;
        for (Result result : results) {
            FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver();
            fantasyPriceDriver.setDriver(result.getDriver());
            fantasyPriceDriver.setRace(nextRace);
            fantasyPriceDriver.setPrice(this.calculateDriverPrice(result));

            if (fantasyPriceDriver.getPrice() == -1)
                pricesProblem = true;

            fantasydriverPrices.add(fantasyPriceDriver);
        }

        if (pricesProblem)
            return new ArrayList<>();

        return fantasydriverPrices;
    }

    /**
     * Calculates and returns the new price for a driver based on the provided race
     * result.
     * 
     * @param result The race result containing information about the driver and the
     *               race.
     * @return The calculated new price for the driver. If there is an issue with
     *         calculation, returns BigDecimal.ZERO.
     */
    public int calculateDriverPrice(Result result) {
        List<FantasyPriceDriver> fantasyPrices = this.fantasyPriceDriverRepository
                .findByRaceId(result.getRace().getId().intValue());
        FantasyPriceDriver fantasyPrice = fantasyPrices.stream()
                .filter(fp -> Objects.equals(fp.getDriver().getId(), result.getDriver().getId()))
                .findFirst()
                .orElse(null);

        if (fantasyPrice == null)
            return -1;

        int price = fantasyPrice.getPrice();

        List<FantasyPointsDriver> fantasyPoints = this.fantasyPointsDriverRepository
                .findByRaceId(result.getRace().getId().intValue());
        FantasyPointsDriver fantasyPoint = fantasyPoints.stream()
                .filter(fp -> Objects.equals(fp.getDriver().getId(), result.getDriver().getId()))
                .findFirst()
                .orElse(null);

        int maxPrice = 30000000;
        int minPrice = 1000000;

        // Calcular el nuevo precio
        if (fantasyPoint == null)
            return -1;
        double points = fantasyPoint.getPoints();

        if (price >= 20000000 && points < 7) {
            price = adjustPriceForReduction(price);
        } else if (price >= 10000000 && points < 5) {
            price = adjustPriceForReduction(price);
        } else if (price >= 6000000 && points <= 3) {
            price = adjustPriceForReduction(price);
        } else if (price >= 4000000 && points <= 1) {
            price = adjustPriceForReduction(price);
        } else if (price >= minPrice && points < 1) {
            price = adjustPriceForReduction(price);
        } else {
            price += (points / 5.0) * minPrice;
        }

        // Si el nuevo precio es menor que 1, el precio es 1; si es mayor que 30, el
        // precio es 30
        if (price <= minPrice) {
            price = minPrice;
        }
        if (price >= maxPrice) {
            price = maxPrice;
        }

        return price;
    }

    /**
     * Adjusts the given price based on specific price groups and their
     * corresponding multipliers.
     * 
     * @param newPrice The price to be adjusted based on price groups and
     *                 multipliers.
     * @return The adjusted price as an integer.
     */
    private int adjustPriceForReduction(int newPrice) {
        final int PRICE_GROUP_1 = 20000000;
        final int PRICE_GROUP_2 = 10000000;

        final double PRICE_MULTIPLIER_1 = 0.95;
        final double PRICE_MULTIPLIER_2 = 0.90;
        final double PRICE_MULTIPLIER_3 = 0.87;

        if (newPrice >= PRICE_GROUP_1) {
            return applyMultiplier(newPrice, PRICE_MULTIPLIER_1);
        }

        if (newPrice >= PRICE_GROUP_2) {
            return applyMultiplier(newPrice, PRICE_MULTIPLIER_2);
        }

        return applyMultiplier(newPrice, PRICE_MULTIPLIER_3);
    }

    /**
     * Applies a multiplier to the provided price and returns the result as an
     * integer.
     * 
     * @param price      The price to which the multiplier will be applied.
     * @param multiplier The multiplier to be applied to the price.
     * @return The result of the multiplication converted to an integer.
     */
    private int applyMultiplier(int price, double multiplier) {
        return (int) (price * multiplier);
    }

    /**
     * Creates a list of FantasyPriceTeam objects based on the provided list of
     * FantasyPriceDriver objects and the next race.
     * 
     * @param driversPrices A list of FantasyPriceDriver objects containing
     *                      driver-specific prices.
     * @param nextRace      The next race for which the prices are being calculated.
     * @return A list of FantasyPriceTeam objects with calculated total prices for
     *         each team.
     */
    public List<FantasyPriceTeam> createTeamsPrices(List<FantasyPriceDriver> driversPrices, Race nextRace) {
        return driversPrices.stream()
                .collect(Collectors.groupingBy(
                        fantasyPriceDriverDTO -> fantasyPriceDriverDTO.getDriver().getTeam()))
                .entrySet()
                .stream()
                .map(entry -> {
                    List<FantasyPriceDriver> drivers = entry.getValue()
                            .stream()
                            .sorted(Comparator.comparingDouble(FantasyPriceDriver::getPrice).reversed())
                            .toList();

                    double maxPrice = drivers.get(0).getPrice();
                    double secondMaxPrice = drivers.size() > 1 ? drivers.get(1).getPrice() : 0;

                    double combinedPrice = (0.7 * maxPrice) + (0.3 * secondMaxPrice);

                    FantasyPriceTeam fantasyPriceTeam = new FantasyPriceTeam();
                    fantasyPriceTeam.setTeam(entry.getKey());
                    fantasyPriceTeam.setPrice((int) Math.round(combinedPrice));
                    fantasyPriceTeam.setRace(nextRace);

                    return fantasyPriceTeam;
                })
                .sorted(Comparator.comparingDouble(FantasyPriceTeam::getPrice))
                .toList();
    }

    /**
     * Retrieves a list of all drivers' prices for a specific race, along with their
     * fantasy information,
     * such as total points, average points, and price difference.
     * 
     * @param raceId the ID of the race for which the drivers' fantasy prices and
     *               stats are fetched
     * @return a list of FantasyPriceDriverDTO containing drivers' prices, total
     *         points, average points and price change percentage
     */
    public List<FantasyPriceDriverDTO> getAllDriverPrices(Integer raceId) {
        List<FantasyPriceDriverDTO> fantasyPriceDriverDTOs = this.fantasyPriceImpl
                .convertFantasyPriceDriverToFantasyPriceDriverDTO(
                        this.fantasyPriceDriverRepository.findByRaceId(raceId));
        int totalRacesFinished = this.raceRepository.findAllFinished(Constants.ACTUAL_SEASON).size();
        List<Long> driverIds = fantasyPriceDriverDTOs.stream().map(dto -> dto.getDriver().getId())
                .toList();

        // Obtain all points and prices
        List<FantasyPointsDriver> allFantasyPointsDrivers = this.fantasyPointsDriverRepository
                .findByDriverIds(driverIds);
        Map<Long, List<FantasyPointsDriver>> pointsDriverMap = allFantasyPointsDrivers.stream()
                .collect(Collectors.groupingBy(fantasyPointsDriver -> fantasyPointsDriver.getDriver().getId()));

        List<FantasyPriceDriver> allFantasyPrices = this.fantasyPriceDriverRepository
                .findTwoLastPricesForAllDrivers(driverIds);
        Map<Long, List<FantasyPriceDriver>> priceDriverMap = allFantasyPrices.stream()
                .collect(Collectors.groupingBy(fantasyPriceDriver -> fantasyPriceDriver.getDriver().getId()));

        for (FantasyPriceDriverDTO fantasyPriceDriverDTO : fantasyPriceDriverDTOs) {
            fantasyPriceDriverDTO.setFantasyInfo(new FantasyInfoDTO());

            // Setting total Points and averagePoints
            int totalPoints = pointsDriverMap
                    .getOrDefault(fantasyPriceDriverDTO.getDriver().getId(), Collections.emptyList())
                    .stream().mapToInt(FantasyPointsDriver::getPoints).sum();

            fantasyPriceDriverDTO.getFantasyInfo()
                    .setAveragePoints(totalPoints != 0 ? totalPoints / totalRacesFinished : 0);
            fantasyPriceDriverDTO.getFantasyInfo().setTotalPoints(totalPoints);

            // Setting differencePrice
            List<FantasyPriceDriver> driverPrices = priceDriverMap.get(fantasyPriceDriverDTO.getDriver().getId());
            if (driverPrices != null && driverPrices.size() >= 2) {
                double price1 = driverPrices.reversed().get(0).getPrice();
                double price2 = driverPrices.reversed().get(1).getPrice();
                double difference = price2 - price1;
                double percentage = ((difference / price2) * 100) * -1;
                fantasyPriceDriverDTO.getFantasyInfo().setDifferencePrice(percentage);
            }
        }

        fantasyPriceDriverDTOs.sort(Comparator
                .comparingInt((FantasyPriceDriverDTO dto) -> dto.getFantasyInfo().getTotalPoints()).reversed());

        return fantasyPriceDriverDTOs;
    }

    /**
     * Retrieves a list of all teams' prices for a specific race, along with their
     * fantasy information,
     * such as total points, average points, and price difference.
     * 
     * @param raceId the ID of the race for which the teams' fantasy prices and
     *               stats are fetched
     * @return a list of FantasyPriceTeamDTO containing teams' prices, total points,
     *         average points and price change percentage
     */
    public List<FantasyPriceTeamDTO> getAllTeamPrices(Integer raceId) {
        List<FantasyPriceTeamDTO> fantasyPriceTeamDTOs = this.fantasyPriceImpl
                .convertFantasyPriceTeamToFantasyPriceTeamDTO(this.fantasyPriceTeamRepository.findByRaceId(raceId));
        int totalRacesFinished = this.raceRepository.findAllFinished(Constants.ACTUAL_SEASON).size();
        List<Long> teamIds = fantasyPriceTeamDTOs.stream().map(dto -> dto.getTeam().getId())
                .toList();

        // Obtain all points and prices
        List<FantasyPointsTeam> allFantasyPointsTeams = this.fantasyPointsTeamRepository.findByTeamIds(teamIds);
        Map<Long, List<FantasyPointsTeam>> pointsTeamMap = allFantasyPointsTeams.stream()
                .collect(Collectors.groupingBy(fantasyPointsTeam -> fantasyPointsTeam.getTeam().getId()));

        List<FantasyPriceTeam> allFantasyPrices = this.fantasyPriceTeamRepository.findTwoLastPricesForAllTeams(teamIds);
        Map<Long, List<FantasyPriceTeam>> priceDriverMap = allFantasyPrices.stream()
                .collect(Collectors.groupingBy(fantasyPointsTeam -> fantasyPointsTeam.getTeam().getId()));

        for (FantasyPriceTeamDTO fantasyPriceTeamDTO : fantasyPriceTeamDTOs) {
            fantasyPriceTeamDTO.setFantasyInfo(new FantasyInfoDTO());

            // Setting total Points and averagePoints
            int totalPoints = pointsTeamMap.getOrDefault(fantasyPriceTeamDTO.getTeam().getId(), Collections.emptyList())
                    .stream().mapToInt(FantasyPointsTeam::getPoints).sum();

            fantasyPriceTeamDTO.getFantasyInfo()
                    .setAveragePoints(totalPoints != 0 ? totalPoints / totalRacesFinished : 0);
            fantasyPriceTeamDTO.getFantasyInfo().setTotalPoints(totalPoints);

            // Setting differencePrice
            List<FantasyPriceTeam> teamPrices = priceDriverMap.get(fantasyPriceTeamDTO.getTeam().getId());
            if (teamPrices != null && teamPrices.size() >= 2) {
                double price1 = teamPrices.reversed().get(0).getPrice();
                double price2 = teamPrices.reversed().get(1).getPrice();
                double difference = price2 - price1;
                double percentage = ((difference / price2) * 100) * -1;
                fantasyPriceTeamDTO.getFantasyInfo().setDifferencePrice(percentage);
            }
        }

        fantasyPriceTeamDTOs.sort(Comparator
                .comparingInt((FantasyPriceTeamDTO dto) -> dto.getFantasyInfo().getTotalPoints()).reversed());

        return fantasyPriceTeamDTOs;
    }

    /**
     * Calculates fantasy points for users based on their fantasy elections in the
     * specified race.
     *
     * @param raceId The ID of the race for which fantasy points are to be
     *               retrieved.
     * @return List of FantasyPointsAccountDTO objects containing user information
     *         and total fantasy points.
     */
    public List<FantasyPointsAccountDTO> getFantasyPoints(int raceId) {
        List<FantasyPointsAccountDTO> fantasyPointsAccountDTOs = new ArrayList<>();
        List<FantasyElection> fantasyElections = this.fantasyElectionRepository.findByRaceId(raceId);
        List<FantasyPointsDriver> fantasyPointsDrivers = this.fantasyPointsDriverRepository.findByRaceId(raceId);
        List<FantasyPointsTeam> fantasyPointsTeams = this.fantasyPointsTeamRepository.findByRaceId(raceId);

        for (FantasyElection fantasyElection : fantasyElections) {
            FantasyPointsAccountDTO fantasyPointsAccountDTO = new FantasyPointsAccountDTO();
            AccountDTO accountDTO = this.accountImpl.accountToAccountDTO(fantasyElection.getAccount());
            FantasyElectionDTO fantasyElectionDTO = this.fantasyElectionImpl
                    .fantasyElectionToFantasyElectionDTO(fantasyElection);
            int points = 0;

            List<FantasyPointsDriver> driversFound = fantasyPointsDrivers.stream()
                    .filter((FantasyPointsDriver driver) -> driver.getDriver().getId()
                            .equals(fantasyElection.getDriverOne().getId()) ||
                            driver.getDriver().getId().equals(fantasyElection.getDriverTwo().getId()) ||
                            driver.getDriver().getId().equals(fantasyElection.getDriverThree().getId()))
                    .toList();

            List<FantasyPointsTeam> teamsFound = fantasyPointsTeams.stream()
                    .filter((FantasyPointsTeam team) -> team.getTeam().getId()
                            .equals(fantasyElection.getTeamOne().getId()) ||
                            team.getTeam().getId().equals(fantasyElection.getTeamTwo().getId()))
                    .toList();

            for (FantasyPointsDriver driver : driversFound) {
                points += driver.getPoints();
            }

            for (FantasyPointsTeam team : teamsFound) {
                points += team.getPoints();
            }

            fantasyPointsAccountDTO.setAccount(accountDTO);
            fantasyPointsAccountDTO.setFantasyElection(fantasyElectionDTO);
            fantasyPointsAccountDTO.setTotalPoints(points);
            fantasyPointsAccountDTOs.add(fantasyPointsAccountDTO);
        }

        fantasyPointsAccountDTOs = fantasyPointsAccountDTOs.stream()
                .sorted(Comparator.comparingInt(FantasyPointsAccountDTO::getTotalPoints).reversed())
                .collect(Collectors.toList());

        return fantasyPointsAccountDTOs;
    }

    /**
     * Retrieves the sum of fantasy points for all users across all previous races
     * in the current season.
     *
     * @return List of FantasyPointsAccountDTO objects with total points aggregated
     *         for each user.
     */
    public List<FantasyPointsAccountDTO> sumAllFantasyPoints(int seasonNumber) {
        List<FantasyPointsAccountDTO> fantasyPointsAccountDTOs = new ArrayList<>();
        List<RaceDTO> raceDTOsNotFinishedAndNextOne = this.raceImpl
                .convertRacesToRacesDTO(this.raceRepository.findAllFinished(seasonNumber));

        for (RaceDTO race : raceDTOsNotFinishedAndNextOne) {
            fantasyPointsAccountDTOs.addAll(this.getFantasyPoints(Integer.parseInt(race.getId().toString())));
        }

        Map<Long, FantasyPointsAccountDTO> accountPointsMap = new HashMap<>();

        for (FantasyPointsAccountDTO fantasyPointsAccountDTO : fantasyPointsAccountDTOs) {
            Long userId = fantasyPointsAccountDTO.getAccount().getId();

            if (accountPointsMap.containsKey(userId)) {
                FantasyPointsAccountDTO existingUserDTO = accountPointsMap.get(userId);
                existingUserDTO
                        .setTotalPoints(existingUserDTO.getTotalPoints() + fantasyPointsAccountDTO.getTotalPoints());
                existingUserDTO.setFantasyElection(fantasyPointsAccountDTO.getFantasyElection());
            } else {
                accountPointsMap.put(userId, fantasyPointsAccountDTO);
            }
        }

        fantasyPointsAccountDTOs = new ArrayList<>(accountPointsMap.values())
                .stream()
                .sorted(Comparator.comparingInt(FantasyPointsAccountDTO::getTotalPoints).reversed())
                .collect(Collectors.toList());

        return fantasyPointsAccountDTOs;
    }

    /**
     * Get the Fantasy Election of a user and race.
     * 
     * @param raceId Race id.
     * @param userId User ID.
     * @return Fantasy Election.
     */
    public FantasyElectionDTO getFantasyElection(int raceId, int userId) {
        Optional<FantasyElection> fantasyElection = this.fantasyElectionRepository.findByUserIdAndRaceId(userId,
                raceId);
        return fantasyElection.isPresent()
                ? this.fantasyElectionImpl.fantasyElectionToFantasyElectionDTO(fantasyElection.get())
                : null;
    }
}
