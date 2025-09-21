export class Account {
  id?: number;
  username?: string;
  password?: string;
  email?: string;
  admin?: number;

  constructor(id: number, username: string, password: string, email: string, admin: number);
  constructor(username: string, password: string);
  constructor(id: number);

  constructor(...args: any[]) {
    if (args.length === 2) {
      this.username = args[0];
      this.password = args[1];
    } else if (args.length === 5) {
      this.id = args[0];
      this.username = args[1];
      this.password = args[2];
      this.email = args[3];
      this.admin = args[4];
    } else if (args.length === 1) {
      this.id = args[0];
    } else {
      throw new Error("Parámetros inválidos en constructor");
    }
  }
}
