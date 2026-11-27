package formula.bollo.utils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.time.temporal.TemporalQueries;

import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

/** Race dates are Madrid wall-clock values, without a stored offset. */
public final class RaceTime {
    private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");

    private RaceTime() {}

    public static LocalDateTime parse(String value) {
        TemporalAccessor parsed = DateTimeFormatter.ISO_DATE_TIME.parse(value);
        return parsed.query(TemporalQueries.offset()) == null
                ? LocalDateTime.from(parsed)
                : LocalDateTime.ofInstant(Instant.from(parsed), MADRID);
    }

    /** Gaps shift forward by the gap; overlaps use the first (earlier) instant. */
    public static Instant toInstant(LocalDateTime value) {
        return value.atZone(MADRID).toInstant();
    }

    public static final class Deserializer extends ValueDeserializer<LocalDateTime> {
        @Override
        public LocalDateTime deserialize(JsonParser parser, DeserializationContext context) {
            String value = parser.getString();
            try {
                return parse(value);
            } catch (java.time.DateTimeException ex) {
                return (LocalDateTime) context.handleWeirdStringValue(LocalDateTime.class, value,
                        "Expected an ISO race date-time: %s", ex.getMessage());
            }
        }
    }
}
