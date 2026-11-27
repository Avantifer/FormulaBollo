import { FantasyClasificationDTO, FantasyClasificationEntry } from '../../../../shared/models/fantasy-clasification';
import { Season } from '../../../../shared/models/season';

export const fantasySeason = new Season(2, 'Temporada 2', 2, '2024');

export function fantasyEntry(userId: number, raceId: number, points: number): FantasyClasificationEntry {
  return { raceId, account: { id: userId, username: 'user' + userId }, points, drivers: [{ driverId: 1, points }, { driverId: 2, points: 0 }, { driverId: 3, points: 0 }], teams: [{ teamId: 1, points: 0 }, { teamId: 2, points: 0 }] };
}

export function fantasyFixture(): FantasyClasificationDTO {
const team = { id: 1, name: 'Ferrari', carImage: 'car.png', logoImage: 'logo-fb.svg', season: fantasySeason };
  const entry = fantasyEntry(1, 25, 51);
  entry.drivers = [{ driverId: 1, points: 0 }, { driverId: 2, points: 18 }, { driverId: 3, points: 8 }];
  entry.teams = [{ teamId: 1, points: 14 }, { teamId: 2, points: 11 }];
  return {
    season: 2,
    races: [
      { id: 25, name: 'Baréin', order: 1, finished: true },
      { id: 26, name: 'Jeddah', order: 2, finished: true },
      { id: 27, name: 'Mónaco', order: 3, finished: true },
      { id: 28, name: 'Monza', order: 4, finished: false }
    ],
    drivers: [
      { id: 1, name: 'Juanudi', number: 1, team, driverImage: 'juanudi.png', season: fantasySeason },
      { id: 2, name: 'Dani Calde', number: 2, team, driverImage: '', season: fantasySeason },
      { id: 3, name: 'Moraga', number: 3, team, driverImage: 'moraga.png', season: fantasySeason }
    ],
    teams: [team, { ...team, id: 2, name: 'McLaren', carImage: 'mclaren.png' }],
    entries: [entry, fantasyEntry(2, 25, 51), fantasyEntry(3, 25, 40), fantasyEntry(1, 26, 0), fantasyEntry(2, 26, 60), fantasyEntry(3, 27, 100)]
  };
}
