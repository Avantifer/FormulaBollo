package formula.bollo.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.cache.CacheManager;
import org.springframework.cache.transaction.TransactionAwareCacheManagerProxy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    static BeanPostProcessor transactionAwareCaches() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                // Keep Boot's configured cache provider, deferring writes and evictions until commit.
                return bean instanceof CacheManager manager
                        ? new TransactionAwareCacheManagerProxy(manager) : bean;
            }
        };
    }
}
