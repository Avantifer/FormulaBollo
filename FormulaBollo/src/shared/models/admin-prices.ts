export interface AdminPriceEntry {
  id: number;
  name: string;
  storedPrice: number | null;
  suggestedPrice: number | null;
}

export interface AdminPrices {
  drivers: AdminPriceEntry[];
  teams: AdminPriceEntry[];
}

export interface AdminPricesUpdate {
  drivers: { id: number; price: number }[];
  teams: { id: number; price: number }[];
}
