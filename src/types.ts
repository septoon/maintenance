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
