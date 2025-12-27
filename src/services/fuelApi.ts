import axios from 'axios';
import { FuelRecord, FuelRecordInput } from '../types';

const GAS_API_URL = process.env.REACT_APP_API_GAS;

type FuelApiConfig = {
  readUrl: string;
  createUrl: string;
};

let cachedConfig: FuelApiConfig | null = null;

function ensureGasApiUrl(): string {
  if (!GAS_API_URL) {
    throw new Error('Не указан адрес сервера. Добавьте REACT_APP_API_GAS в .env.');
  }
  return GAS_API_URL;
}

function toAbsoluteUrl(rawUrl: string, base?: string): URL {
  try {
    return base ? new URL(rawUrl, base) : new URL(rawUrl);
  } catch (error) {
    if (typeof window !== 'undefined') {
      const origin = base ?? window.location.origin;
      return new URL(rawUrl, origin);
    }
    throw error;
  }
}

function extractPostOverride(parsed: URL): string | null {
  let override: string | null = null;

  if (parsed.searchParams.has('post')) {
    override = parsed.searchParams.get('post') ?? null;
    parsed.searchParams.delete('post');
  }

  if (parsed.hash) {
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    if (!override && hashParams.has('post')) {
      override = hashParams.get('post') ?? null;
    }
    hashParams.delete('post');
    const remainingHash = hashParams.toString();
    parsed.hash = remainingHash ? `#${remainingHash}` : '';
  }

  return override;
}

function buildDefaultCreateUrl(parsedInput: URL): string {
  try {
    const parsed = new URL(parsedInput.toString());
    const pathname = parsed.pathname;

    if (pathname.endsWith('.json')) {
      const withoutExtension = pathname.replace(/\.json$/, '');
      const segments = withoutExtension.split('/').filter(Boolean);
      const resourceName = segments[segments.length - 1] ?? 'records';
      parsed.pathname = `/api/${resourceName}`;
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    }

    return parsed.toString();
  } catch (error) {
    console.warn('Не удалось вычислить адрес сохранения. Используем REACT_APP_API_GAS как есть.', error);
    return parsedInput.toString();
  }
}

function resolveConfig(): FuelApiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const baseUrl = ensureGasApiUrl();
  const parsed = toAbsoluteUrl(baseUrl);
  const override = extractPostOverride(parsed);
  const readUrl = parsed.toString();
  const createUrl = override
    ? toAbsoluteUrl(override, parsed.origin).toString()
    : buildDefaultCreateUrl(parsed);

  cachedConfig = { readUrl, createUrl };
  return cachedConfig;
}

function normalizeFuelRecord(raw: any): FuelRecord {
  return {
    id: raw.id ?? raw._id,
    date: String(raw.date ?? ''),
    mileage: raw.mileage !== undefined && raw.mileage !== null ? Number(raw.mileage) : null,
    liters: raw.liters !== undefined && raw.liters !== null ? Number(raw.liters) : null,
    fuelCost:
      raw.fuelCost !== undefined && raw.fuelCost !== null ? Number(raw.fuelCost) : null
  };
}

function normalizeFuelInput(input: FuelRecordInput): FuelRecord {
  return {
    date: input.date,
    mileage:
      input.mileage !== undefined && input.mileage !== null ? Number(input.mileage) : null,
    liters: input.liters !== undefined && input.liters !== null ? Number(input.liters) : null,
    fuelCost:
      input.fuelCost !== undefined && input.fuelCost !== null ? Number(input.fuelCost) : null
  };
}

export async function fetchFuelRecords(): Promise<FuelRecord[]> {
  const { readUrl } = resolveConfig();

  try {
    const response = await axios.get(readUrl, {
      headers: {
        Accept: 'application/json'
      },
      responseType: 'json'
    });

    const data = response.data;

    if (!Array.isArray(data)) {
      throw new Error('Ответ сервера должен быть массивом записей топлива.');
    }

    return data.map(normalizeFuelRecord);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = status ? `Не удалось получить данные топлива (${status})` : 'Не удалось получить данные топлива.';
      throw new Error(message);
    }

    throw new Error('Не удалось получить данные топлива.');
  }
}

export async function createFuelRecord(input: FuelRecordInput): Promise<FuelRecord> {
  const { createUrl, readUrl } = resolveConfig();
  const normalized = normalizeFuelInput(input);

  if (
    normalized.mileage === null &&
    normalized.liters === null &&
    normalized.fuelCost === null
  ) {
    throw new Error('Укажите пробег, бензин или стоимость перед отправкой.');
  }

  const payload: Record<string, unknown> = {
    date: normalized.date
  };

  if (normalized.mileage !== null) {
    if (Number.isNaN(normalized.mileage)) {
      throw new Error('Некорректное значение пробега.');
    }
    payload.mileage = normalized.mileage;
  }

  if (normalized.liters !== null) {
    if (Number.isNaN(normalized.liters)) {
      throw new Error('Некорректное значение количества топлива.');
    }
    payload.liters = normalized.liters;
  }

  if (normalized.fuelCost !== null) {
    if (Number.isNaN(normalized.fuelCost)) {
      throw new Error('Некорректное значение суммы заправки.');
    }
    payload.fuelCost = normalized.fuelCost;
  }

  try {
    const response = await axios.post(createUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      validateStatus: status => (status >= 200 && status < 300) || status === 204
    });

    if (response.status === 204 || response.data === undefined || response.data === '') {
      return normalized;
    }

    return normalizeFuelRecord(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404 || status === 405) {
        return appendFuelRecordViaFileApi(readUrl, normalized);
      }

      const message = status ? `Не удалось сохранить данные топлива (${status})` : 'Не удалось сохранить данные топлива.';
      throw new Error(message);
    }

    throw new Error('Не удалось сохранить данные топлива.');
  }
}

async function appendFuelRecordViaFileApi(readUrl: string, payload: FuelRecord): Promise<FuelRecord> {
  let parsedRead: URL;
  try {
    parsedRead = toAbsoluteUrl(readUrl);
  } catch {
    throw new Error('Не удалось сохранить данные топлива: невалидный адрес данных.');
  }

  const segments = parsedRead.pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) {
    throw new Error('Не удалось сохранить данные топлива: неизвестный файл данных.');
  }

  const fileName = lastSegment.includes('.') ? lastSegment : `${lastSegment}.json`;
  const saveUrl = new URL(`/api/save/${fileName}`, parsedRead.origin).toString();

  try {
    const existing = await axios.get(parsedRead.toString(), {
      headers: { Accept: 'application/json' },
      responseType: 'json'
    });

    if (!Array.isArray(existing.data)) {
      throw new Error('Формат данных на сервере не поддерживает добавление записей.');
    }

    const updatedData = [...existing.data, payload];

    await axios.put(saveUrl, updatedData, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    return payload;
  } catch (fallbackError) {
    if (axios.isAxiosError(fallbackError)) {
      const status = fallbackError.response?.status;
      const message = status ? `Не удалось сохранить данные топлива (${status})` : 'Не удалось сохранить данные топлива.';
      throw new Error(message);
    }

    if (fallbackError instanceof Error) {
      throw fallbackError;
    }

    throw new Error('Не удалось сохранить данные топлива.');
  }
}
