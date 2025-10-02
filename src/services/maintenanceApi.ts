import { MaintenanceRecord, MaintenanceRecordInput } from '../types';

const API_URL = process.env.REACT_APP_API_URL;

function ensureApiUrl(): string {
  if (!API_URL) {
    throw new Error('Не указан адрес сервера. Добавьте REACT_APP_API_URL в .env.');
  }
  return API_URL;
}

export async function fetchRecords(): Promise<MaintenanceRecord[]> {
  const url = ensureApiUrl();
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Не удалось получить данные (${response.status})`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Ответ сервера должен быть массивом записей.');
  }

  return data.map((item: any) => ({
    id: item.id ?? item._id,
    date: String(item.date ?? ''),
    procedure: String(item.procedure ?? ''),
    mileage: Number(item.mileage ?? 0)
  }));
}

export async function createRecord(payload: MaintenanceRecordInput): Promise<MaintenanceRecord> {
  const url = ensureApiUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Не удалось сохранить запись (${response.status})`);
  }

  const data = await response.json();

  return {
    id: data.id ?? data._id,
    date: data.date ?? payload.date,
    procedure: data.procedure ?? payload.procedure,
    mileage: Number(data.mileage ?? payload.mileage)
  };
}
