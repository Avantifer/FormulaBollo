import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { DriverPoints } from '../shared/models/driverPoints';
import { Season } from '../shared/models/season';
import { TeamWithDrivers } from '../shared/models/teamWithDrivers';
import { ImageService } from '../shared/services/image.service';

/** Real components use an isolated HTTP backend and deterministic route inputs. */
export function provideComponentTesting() {
  localStorage.clear();
  const params = { name: 'Piloto_de_prueba', season: '1' };

  return [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    MessageService,
    { provide: JWT_OPTIONS, useValue: {} },
    JwtHelperService,
    {
      provide: ActivatedRoute,
      useValue: {
        snapshot: { paramMap: convertToParamMap(params), params },
        params: of(params),
        queryParams: of({}),
        fragment: of(null),
      },
    },
    {
      provide: ImageService,
      useValue: {
        getImageUrl: () =>
          'assets/test.png',
      },
    },
  ];
}

const season = new Season(1, 'Temporada de prueba', 1);
const team = {
  id: 1,
  name: 'Ferrari',
  carImage: 'car.png',
  logoImage: 'logo.png',
  season,
};

export const driverPointsFixture: DriverPoints = {
  driver: {
    id: 1,
    name: 'Piloto de prueba',
    number: 7,
    team,
    driverImage: 'driver.png',
    season,
  },
  totalPoints: 25,
  positionChange: 'SAME',
  positionChangeAmount: 0,
};

export const teamPointsFixture: TeamWithDrivers = {
  team,
  driver1: driverPointsFixture,
  driver2: {
    ...driverPointsFixture,
    driver: { ...driverPointsFixture.driver, id: 2, name: 'Segundo piloto' },
    totalPoints: 18,
  },
  totalPoints: 43,
  positionChange: 'SAME',
  positionChangeAmount: 0,
};
