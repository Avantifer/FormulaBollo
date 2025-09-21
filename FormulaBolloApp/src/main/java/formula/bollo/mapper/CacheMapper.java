package formula.bollo.mapper;

import org.mapstruct.Mapper;

import formula.bollo.entity.Cache;
import formula.bollo.model.CacheDTO;

@Mapper(componentModel = "spring")
public interface CacheMapper {
    public CacheDTO cacheToCacheDTO(Cache cache);

    public Cache cacheDTOToCache(CacheDTO cacheDTO);
}

