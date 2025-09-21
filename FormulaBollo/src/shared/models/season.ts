export class Season {
  id: number;
  name: string;
  number: number;
  year?: string;

  constructor(id: number, name: string, number: number, year?: string) {
    this.id = id;
    this.name = name;
    this.number = number;
    this.year = year;
  }
}
