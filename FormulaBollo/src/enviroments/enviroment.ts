import { Season } from "../shared/models/season";

export const environment = {
  production: false,
  apiUrl: "http://localhost:8080",
  wsUrl: "ws://localhost:8080/ws/cache-version",
  seasonActual: new Season(3, "Temporada 3", 3)
};
