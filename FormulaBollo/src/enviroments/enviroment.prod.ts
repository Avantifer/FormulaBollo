import { Season } from "../shared/models/season";

export const environment = {
  production: true,
  apiUrl: "https://formulabollo.es:8443",
  wsUrl: "wss://formulabollo.es:8443/ws/cache-version",
  seasonActual: new Season(3, "Temporada 3", 3)
};
