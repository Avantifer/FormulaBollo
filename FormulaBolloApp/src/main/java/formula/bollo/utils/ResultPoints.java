package formula.bollo.utils;

import formula.bollo.entity.Result;
import formula.bollo.model.ResultDTO;

public final class ResultPoints {
    private ResultPoints() { }

    public static int calculate(Result result) {
        return calculate(result.getPosition() == null ? null : result.getPosition().getPoints(), result.getFastlap());
    }

    public static int calculate(ResultDTO result) {
        return calculate(result.getPosition() == null ? null : result.getPosition().getPoints(), result.getFastlap());
    }

    /** La vuelta rápida puntúa también sin posición de llegada. */
    private static int calculate(Integer positionPoints, int fastlap) {
        return (positionPoints == null ? 0 : positionPoints) + fastlap;
    }
}
