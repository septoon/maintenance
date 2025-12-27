export type MaintenanceRecord = {
  id?: string;
  date: string;
  procedure: string;
  mileage: number;
};

export type MaintenanceRecordInput = {
  date: string;
  procedure: string;
  mileage: number;
};

export type FuelRecord = {
  id?: string;
  date: string;
  mileage?: number | null;
  liters?: number | null;
  fuelCost?: number | null;
};

export type FuelRecordInput = {
  date: string;
  mileage?: number | null;
  liters?: number | null;
  fuelCost?: number | null;
};

export type SalaryEntry = {
  date: string;
  baseSalary: number;
  weekendPay: number;
};

export type SalaryMonth = {
  month: string;
  entries: SalaryEntry[];
};
