package formula.bollo.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Driver;
import formula.bollo.mapper.DriverMapper;
import formula.bollo.model.DriverDTO;

@Service
public class DriverImpl {

    private final DriverMapper driverMapper;

    public DriverImpl(DriverMapper driverMapper) {
        this.driverMapper = driverMapper;
    }

    public List<DriverDTO> convertListDriversToDriversDTO(List<Driver> drivers) {
        return driverMapper.convertListDriversToDriversDTO(drivers);
    }

    public DriverDTO driverToDriverDTO(Driver driver) {
        return driverMapper.driverToDriverDTO(driver);
    }

    public Driver driverDTOToDriver(DriverDTO driver) {
        return driverMapper.driverDTOToDriver(driver);
    }
}
