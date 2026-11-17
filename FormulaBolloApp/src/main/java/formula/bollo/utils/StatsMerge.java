package formula.bollo.utils;

/** Reglas comunes al fusionar las estadísticas de un mismo piloto o equipo repartidas en varias temporadas. */
public final class StatsMerge {
    private StatsMerge() {
    }

    /** Mejor posición: el mínimo de las positivas; 0 significa "sin resultados" y nunca gana. */
    public static int bestPosition(int a, int b) {
        if (a <= 0)
            return Math.max(b, 0);
        if (b <= 0)
            return a;
        return Math.min(a, b);
    }

    /** Media de posiciones ponderada por las carreras terminadas de cada parte, con 4 decimales. */
    public static double weightedAverage(double averageA, int racesA, double averageB, int racesB) {
        int total = racesA + racesB;
        return total == 0 ? 0 : Math.round((averageA * racesA + averageB * racesB) / total * 10000d) / 10000d;
    }
}
