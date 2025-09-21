package formula.bollo.impl;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Cache;
import formula.bollo.mapper.CacheMapper;
import formula.bollo.model.CacheDTO;

@Service
public class CacheImpl {
    
  private final CacheMapper cacheMapper;

  public CacheImpl(CacheMapper cacheMapper) {
    this.cacheMapper = cacheMapper;
  }

  public CacheDTO cacheToCacheDTO(Cache cache) {
    return this.cacheMapper.cacheToCacheDTO(cache);
  }

  public Cache cacheDTOToCache(CacheDTO cacheDTO) {
    return this.cacheMapper.cacheDTOToCache(cacheDTO);
  }
}
