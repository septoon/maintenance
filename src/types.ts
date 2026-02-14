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
  recordType?: 'fuel' | 'adjustment';
  adjustmentKind?: 'compensation_payment' | 'debt_deduction' | null;
  monthKey?: string | null;
  amount?: number | null;
  comment?: string | null;
  date: string;
  mileage?: number | null;
  liters?: number | null;
  fuelCost?: number | null;
};

export type FuelRecordInput = {
  recordType?: 'fuel' | 'adjustment';
  adjustmentKind?: 'compensation_payment' | 'debt_deduction' | null;
  monthKey?: string | null;
  amount?: number | null;
  comment?: string | null;
  date: string;
  mileage?: number | null;
  liters?: number | null;
  fuelCost?: number | null;
};

export type SalaryEntry = {
  id?: string;
  date: string;
  baseSalary: number;
  weekendPay: number;
};

export type SalaryEntryInput = {
  date: string;
  baseSalary: number;
  weekendPay?: number | null;
};

export type SalaryMonth = {
  month: string;
  entries: SalaryEntry[];
};
