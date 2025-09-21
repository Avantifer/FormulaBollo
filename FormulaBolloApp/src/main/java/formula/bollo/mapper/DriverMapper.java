package formula.bollo.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.springframework.data.domain.Page;

import formula.bollo.entity.Driver;
import formula.bollo.model.DriverDTO;

@Mapper(componentModel = "spring")
public interface DriverMapper {

    DriverDTO driverToDriverDTO(Driver driver);

    Driver driverDTOToDriver(DriverDTO driver);

    List<DriverDTO> convertPageDriversToDriversDTO(Page<Driver> drivers);

    List<DriverDTO> convertListDriversToDriversDTO(List<Driver> drivers);
}