package formula.bollo.service;

import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.cache.annotation.CacheEvict;

import java.time.Clock;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import formula.bollo.entity.FantasyElection;
import formula.bollo.entity.Account;
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
import formula.bollo.model.DriverDTO;
import formula.bollo.model.FantasyElectionDTO;
import formula.bollo.model.FantasyInfoDTO;
import formula.bollo.model.FantasyPointsAccountDTO;
import formula.bollo.model.FantasyPriceDriverDTO;
import formula.bollo.model.FantasyPriceTeamDTO;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.TeamDTO;
import formula.bollo.repository.FantasyElectionRepository;
import formula.bollo.repository.AccountRepository;
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
    private static final int LOW_PRICE_DRIVER_LIMIT = 10_000_000;
    private static final int MEDIUM_PRICE_DRIVER_LIMIT = 20_000_000;
    private static final Comparator<Race> CALENDAR_ORDER = Comparator.comparing(Race::getDateStart)
            .thenComparing(Race::getId);

    private final Clock clock;
    private AccountRepository accountRepository;
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
            AccountRepository accountRepository,
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
            RaceImpl raceImpl,
            Clock clock) {
        this.accountRepository = accountRepository;
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
        this.clock = clock;
    }

    private void validateResults(List<Result> results) {
        for (Result result : results) {
            if (result == null || result.getRace() == null || result.getRace().getId() == null
                    || result.getDriver() == null || result.getDriver().getId() == null
                    || result.getDriver().getTeam() == null || result.getDriver().getTeam().getId() == null
                    || !Objects.equals(results.getFirst().getRace().getId(), result.getRace().getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resultados incompletos para Fantasy");
            }
        }
    }

    private Map<Long, FantasyPriceDriver> pricesByDriver(Race race) {
        Map<Long, FantasyPriceDriver> prices = new HashMap<>();
        for (FantasyPriceDriver price : fantasyPriceDriverRepository.findByRaceId(race.getId().intValue())) {
            if (price == null || price.getDriver() == null || price.getDriver().getId() == null
                    || price.getRace() == null || price.getRace().getId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Precios incompletos para Fantasy");
            }
            prices.putIfAbsent(price.getDriver().getId(), price);
        }
        return prices;
    }

    private Map<Long, FantasyPointsDriver> pointsByDriver(Race race) {
        Map<Long, FantasyPointsDriver> points = new HashMap<>();
        for (FantasyPointsDriver point : fantasyPointsDriverRepository.findByRaceId(race.getId().intValue())) {
            if (point == null || point.getDriver() == null || point.getDriver().getId() == null
                    || point.getRace() == null || point.getRace().getId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Puntos incompletos para Fantasy");
            }
            points.putIfAbsent(point.getDriver().getId(), point);
        }
        return points;
    }

    /** Carreras de la misma temporada que se corren antes que la dada, en orden de calendario. */
    private List<Race> racesBefore(Race race) {
        return raceRepository.findBySeason(race.getSeason().getNumber()).stream()
                .filter(other -> CALENDAR_ORDER.compare(other, race) < 0)
                .sorted(CALENDAR_ORDER)
                .toList();
    }

    /** La carrera siguiente de la misma temporada según el calendario (fecha y luego id), no según el id. */
    private Optional<Race> nextRaceAfter(Race race) {
        return raceRepository.findBySeason(race.getSeason().getNumber()).stream()
                .filter(other -> CALENDAR_ORDER.compare(other, race) > 0)
                .min(CALENDAR_ORDER);
    }

    /** Puntos y media hasta antes de la carrera; la variación es el cambio del precio frente a la carrera anterior. */
    private static FantasyInfoDTO fantasyInfo(int totalPoints, int finishedRaces, Integer previousPrice, int price) {
        FantasyInfoDTO info = new FantasyInfoDTO();
        info.setTotalPoints(totalPoints);
        info.setAveragePoints(finishedRaces != 0 ? totalPoints / finishedRaces : 0);
        if (previousPrice != null && previousPrice != 0)
            info.setDifferencePrice((price - previousPrice) / (double) previousPrice * 100);
        return info;
    }

    /**
     * Saves the fantasy points for both drivers and teams for a given race.
     *
     * @param raceId the ID of the race for which points need to be saved
     * @return a ResponseEntity containing a success message or error message.
     */
    @CacheEvict(cacheNames = Constants.CACHE_STATS, allEntries = true)
    @Transactional
    public ResponseEntity<String> saveDriverTeamPoints(int raceId) {
        List<Result> results = this.resultRepository.findByRaceId(raceId);
        validateResults(results);
        List<FantasyPointsDriver> fantasyDriversPrevious = this.fantasyPointsDriverRepository.findByRaceId(raceId);

        List<FantasyPointsDriver> fantasyPointsDriver = this.createDriversPoints(results);

        if (fantasyPointsDriver.isEmpty()) {
            log.error("Hubo un problema con los puntos");
            return new ResponseEntity<>("Hubo un problema con los puntos. Contacte con el administrador",
                    Constants.HEADERS_TEXT_PLAIN, HttpStatusCode.valueOf(500));
        }

        List<FantasyPointsTeam> fantasyPointsTeams = this.createTeamsPoints(fantasyPointsDriver);
        List<FantasyPointsTeam> fantasyTeamsPrevious = this.fantasyPointsTeamRepository.findByRaceId(raceId);

        fantasyPointsDriverRepository.deleteAll(fantasyDriversPrevious);
        fantasyPointsDriverRepository.saveAll(fantasyPointsDriver);
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
    @CacheEvict(cacheNames = Constants.CACHE_STATS, allEntries = true)
    @Transactional
    public ResponseEntity<String> saveDriverTeamPrices(int raceId) {
        List<Result> results = this.resultRepository.findByRaceId(raceId);
        validateResults(results);
        Race race = this.raceRepository.findById((long) raceId).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No se ha encontrado la carrera"));
        Optional<Race> nextRace = nextRaceAfter(race);

        if (nextRace.isEmpty()) {
            // Tras la última carrera de la temporada no hay precios que calcular: no es un error.
            return new ResponseEntity<>("Era la última carrera de la temporada: no hay precios que calcular",
                    Constants.HEADERS_TEXT_PLAIN, HttpStatusCode.valueOf(200));
        }

        int nextRaceId = nextRace.get().getId().intValue();
        List<FantasyPriceDriver> fantasyDriversPrevious = this.fantasyPriceDriverRepository.findByRaceId(nextRaceId);
        List<FantasyPriceDriver> fantasyPricesDriver = this.createDriversPrices(results, nextRace.get());
        if (fantasyPricesDriver.isEmpty()) {
            log.error("Hubo un problema con los precios");
            return new ResponseEntity<>("Hubo un problema con los precios. Contacte con el administrador",
                    Constants.HEADERS_TEXT_PLAIN, HttpStatusCode.valueOf(500));
        }

        List<FantasyPriceTeam> fantasyTeamPrevious = this.fantasyPriceTeamRepository.findByRaceId(nextRaceId);
        List<FantasyPriceTeam> fantasyPricesTeam = this.createTeamsPrices(fantasyPricesDriver, nextRace.get());

        fantasyPriceDriverRepository.deleteAll(fantasyDriversPrevious);
        fantasyPriceDriverRepository.saveAll(fantasyPricesDriver);
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
    @CacheEvict(cacheNames = Constants.CACHE_STATS, allEntries = true)
    @Transactional
    public ResponseEntity<String> saveFantasyElection(FantasyElectionDTO fantasyElectionDTO, String username) {
        if (fantasyElectionDTO == null || fantasyElectionDTO.getRace() == null
                || fantasyElectionDTO.getRace().getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes indicar la carrera de tu equipo");
        }
        List<Account> accounts = this.accountRepository.findByUsername(username);
        if (accounts.isEmpty()) {
            return new ResponseEntity<>("No se ha podido encontrar el usuario", HttpStatusCode.valueOf(403));
        }
        Account account = accounts.get(0);
        Race race = this.raceRepository.findById(fantasyElectionDTO.getRace().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No se ha encontrado la carrera"));
        // El frontend envía UTC y dateStart se persiste como LocalDateTime sin zona.
        if (race.getFinished() == 1 || !clock.instant().isBefore(
                race.getDateStart().toInstant(ZoneOffset.UTC).minusSeconds(12 * 3600))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "El plazo para guardar tu equipo ha terminado");
        }
        validateElectionBudget(fantasyElectionDTO, race);
        // El propietario y el id de la elección se resuelven en el servidor.
        fantasyElectionDTO.setAccount(this.accountImpl.accountToAccountDTO(account));
        fantasyElectionDTO.setId(null);
        FantasyElection fantasyElection = this.fantasyElectionImpl
                .fantasyElectionDTOToFantasyElection(fantasyElectionDTO);
        fantasyElection.setAccount(account);
        fantasyElection.setRace(race);
        try {
            Optional<FantasyElection> fantasyElectionPrevious = this.fantasyElectionRepository.findByUserIdAndRaceId(
                    account.getId().intValue(),
                    fantasyElectionDTO.getRace().getId().intValue());

            fantasyElection.setId(fantasyElectionPrevious.map(FantasyElection::getId).orElse(null));
            this.fantasyElectionRepository.saveAndFlush(fantasyElection);
        } catch (DataIntegrityViolationException | ConcurrencyFailureException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tu equipo ya se estaba guardando. Vuelve a intentarlo");
        }

        return new ResponseEntity<>("Tu equipo ha sido guardado correctamente", Constants.HEADERS_TEXT_PLAIN,
                HttpStatusCode.valueOf(200));
    }

    private void validateElectionBudget(FantasyElectionDTO election, Race race) {
        List<DriverDTO> drivers = Arrays.asList(election.getDriverOne(), election.getDriverTwo(), election.getDriverThree());
        List<TeamDTO> teams = Arrays.asList(election.getTeamOne(), election.getTeamTwo());
        if (drivers.stream().anyMatch(driver -> driver == null || driver.getId() == null)
                || teams.stream().anyMatch(team -> team == null || team.getId() == null)
                || drivers.stream().map(DriverDTO::getId).distinct().count() != 3
                || teams.stream().map(TeamDTO::getId).distinct().count() != 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Debes elegir 3 pilotos y 2 escuderías distintos y completos");
        }

        List<FantasyPriceDriver> driverPrices = fantasyPriceDriverRepository.findByRaceId(race.getId().intValue());
        List<FantasyPriceTeam> teamPrices = fantasyPriceTeamRepository.findByRaceId(race.getId().intValue());
        String missingPrice = "Todos los pilotos y escuderías deben tener precio para esta carrera";
        long total = 0;
        for (DriverDTO driver : drivers) {
            total += driverPrices.stream().filter(price -> Objects.equals(price.getDriver().getId(), driver.getId()))
                    .mapToLong(FantasyPriceDriver::getPrice).findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, missingPrice));
        }
        for (TeamDTO team : teams) {
            total += teamPrices.stream().filter(price -> Objects.equals(price.getTeam().getId(), team.getId()))
                    .mapToLong(FantasyPriceTeam::getPrice).findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, missingPrice));
        }
        if (total > Constants.FANTASY_BUDGET) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Te pasas del presupuesto");
        }
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
        if (results.isEmpty())
            return fantasyPoints;
        Map<Long, FantasyPriceDriver> prices = pricesByDriver(results.getFirst().getRace());
        int sizeResults = results.stream().filter(result -> result.getPosition() != null).toList().size();
        boolean pointsProblem = false;

        for (Result result : results) {
            FantasyPointsDriver fantasyPoint = new FantasyPointsDriver();
            fantasyPoint.setDriver(result.getDriver());
            fantasyPoint.setRace(result.getRace());
            fantasyPoint.setPoints(this.calculatePoints(result, sizeResults, prices));
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
        return calculatePoints(result, resultsSize, pricesByDriver(result.getRace()));
    }

    private int calculatePoints(Result result, int resultsSize, Map<Long, FantasyPriceDriver> prices) {
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

        FantasyPriceDriver fantasyPrice = prices.get(result.getDriver().getId());

        if (fantasyPrice == null)
            return -1;

        int priceDriver = fantasyPrice.getPrice();

        // Los precios se guardan en unidades monetarias, no en millones.
        if (priceDriver < LOW_PRICE_DRIVER_LIMIT && goodPosition)
            points += 8;

        if (priceDriver <= MEDIUM_PRICE_DRIVER_LIMIT && priceDriver >= LOW_PRICE_DRIVER_LIMIT && goodPosition)
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
        if (results.isEmpty())
            return fantasydriverPrices;
        Map<Long, FantasyPriceDriver> prices = pricesByDriver(results.getFirst().getRace());
        Map<Long, FantasyPointsDriver> points = pointsByDriver(results.getFirst().getRace());

        boolean pricesProblem = false;
        for (Result result : results) {
            FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver();
            fantasyPriceDriver.setDriver(result.getDriver());
            fantasyPriceDriver.setRace(nextRace);
            fantasyPriceDriver.setPrice(this.calculateDriverPrice(result, prices, points));

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
        return calculateDriverPrice(result, pricesByDriver(result.getRace()), pointsByDriver(result.getRace()));
    }

    private int calculateDriverPrice(Result result, Map<Long, FantasyPriceDriver> prices,
            Map<Long, FantasyPointsDriver> pointsByDriver) {
        FantasyPriceDriver fantasyPrice = prices.get(result.getDriver().getId());

        if (fantasyPrice == null)
            return -1;

        int price = fantasyPrice.getPrice();

        FantasyPointsDriver fantasyPoint = pointsByDriver.get(result.getDriver().getId());

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
            price += (int) ((points / 5.0) * minPrice);
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
        // Puntos y variación de precio se calculan con las carreras anteriores de la temporada, no con todas.
        List<Race> previousRaces = this.raceRepository.findById(raceId.longValue()).map(this::racesBefore)
                .orElse(List.of());
        int finishedRaces = (int) previousRaces.stream().filter(race -> race.getFinished() == 1).count();
        List<Long> driverIds = fantasyPriceDriverDTOs.stream().map(dto -> dto.getDriver().getId()).toList();

        Map<Long, Integer> totalPoints = previousRaces.isEmpty() || driverIds.isEmpty() ? Map.of()
                : this.fantasyPointsDriverRepository
                        .findByDriverIdsAndRaceIds(driverIds, previousRaces.stream().map(Race::getId).toList())
                        .stream().collect(Collectors.groupingBy(points -> points.getDriver().getId(),
                                Collectors.summingInt(FantasyPointsDriver::getPoints)));
        Map<Long, Integer> previousPrices = previousRaces.isEmpty() ? Map.of()
                : this.fantasyPriceDriverRepository.findByRaceId(previousRaces.getLast().getId().intValue()).stream()
                        .collect(Collectors.toMap(price -> price.getDriver().getId(), FantasyPriceDriver::getPrice,
                                (first, second) -> first));

        for (FantasyPriceDriverDTO dto : fantasyPriceDriverDTOs) {
            Long driverId = dto.getDriver().getId();
            dto.setFantasyInfo(fantasyInfo(totalPoints.getOrDefault(driverId, 0), finishedRaces,
                    previousPrices.get(driverId), dto.getPrice()));
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
        // Puntos y variación de precio se calculan con las carreras anteriores de la temporada, no con todas.
        List<Race> previousRaces = this.raceRepository.findById(raceId.longValue()).map(this::racesBefore)
                .orElse(List.of());
        int finishedRaces = (int) previousRaces.stream().filter(race -> race.getFinished() == 1).count();
        List<Long> teamIds = fantasyPriceTeamDTOs.stream().map(dto -> dto.getTeam().getId()).toList();

        Map<Long, Integer> totalPoints = previousRaces.isEmpty() || teamIds.isEmpty() ? Map.of()
                : this.fantasyPointsTeamRepository
                        .findByTeamIdsAndRaceIds(teamIds, previousRaces.stream().map(Race::getId).toList())
                        .stream().collect(Collectors.groupingBy(points -> points.getTeam().getId(),
                                Collectors.summingInt(FantasyPointsTeam::getPoints)));
        Map<Long, Integer> previousPrices = previousRaces.isEmpty() ? Map.of()
                : this.fantasyPriceTeamRepository.findByRaceId(previousRaces.getLast().getId().intValue()).stream()
                        .collect(Collectors.toMap(price -> price.getTeam().getId(), FantasyPriceTeam::getPrice,
                                (first, second) -> first));

        for (FantasyPriceTeamDTO dto : fantasyPriceTeamDTOs) {
            Long teamId = dto.getTeam().getId();
            dto.setFantasyInfo(fantasyInfo(totalPoints.getOrDefault(teamId, 0), finishedRaces,
                    previousPrices.get(teamId), dto.getPrice()));
        }

        fantasyPriceTeamDTOs.sort(Comparator
                .comparingInt((FantasyPriceTeamDTO dto) -> dto.getFantasyInfo().getTotalPoints()).reversed());

        return fantasyPriceTeamDTOs;
    }

    /**
     * Exposes race rankings and elections only after the race has finished.
     */
    public List<FantasyPointsAccountDTO> getFantasyPointsRace(int raceId) {
        Optional<Race> race = this.raceRepository.findById((long) raceId);
        if (race.isEmpty() || race.get().getFinished() != 1) {
            return Collections.emptyList();
        }
        return this.getFantasyPoints(raceId);
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
     * @param username Authenticated username.
     * @return Fantasy Election.
     */
    public FantasyElectionDTO getFantasyElection(int raceId, String username) {
        List<Account> accounts = this.accountRepository.findByUsername(username);
        if (accounts.isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403));
        }
        Account account = accounts.getFirst();
        Optional<FantasyElection> fantasyElection = this.fantasyElectionRepository.findByUserIdAndRaceId(
                account.getId().intValue(), raceId);
        return fantasyElection.isPresent()
                ? this.fantasyElectionImpl.fantasyElectionToFantasyElectionDTO(fantasyElection.get())
                : null;
    }
}
