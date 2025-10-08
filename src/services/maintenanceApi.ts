import axios from 'axios';
import { MaintenanceRecord, MaintenanceRecordInput } from '../types';

const API_URL = process.env.REACT_APP_API_URL;

type ApiConfig = {
  readUrl: string;
  createUrl: string;
};

function normalizeRecord(raw: MaintenanceRecordInput): MaintenanceRecord {
  return {
    id: undefined,
    date: raw.date,
    procedure: raw.procedure,
    mileage: raw.mileage
  };
}

let cachedConfig: ApiConfig | null = null;

function ensureApiUrl(): string {
  if (!API_URL) {
    throw new Error('Не указан адрес сервера. Добавьте REACT_APP_API_URL в .env.');
  }
  return API_URL;
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
    console.warn('Не удалось вычислить адрес сохранения. Используем REACT_APP_API_URL как есть.', error);
    return parsedInput.toString();
  }
}

function resolveConfig(): ApiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const baseUrl = ensureApiUrl();
  const parsed = toAbsoluteUrl(baseUrl);
  const override = extractPostOverride(parsed);
  const readUrl = parsed.toString();
  const createUrl = override
    ? toAbsoluteUrl(override, parsed.origin).toString()
    : buildDefaultCreateUrl(parsed);

  cachedConfig = { readUrl, createUrl };
  return cachedConfig;
}

export async function fetchRecords(): Promise<MaintenanceRecord[]> {
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
      throw new Error('Ответ сервера должен быть массивом записей.');
    }

    return data.map((item: any) => ({
      id: item.id ?? item._id,
      date: String(item.date ?? ''),
      procedure: String(item.procedure ?? ''),
      mileage: Number(item.mileage ?? 0)
    }));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = status ? `Не удалось получить данные (${status})` : 'Не удалось получить данные.';
      throw new Error(message);
    }

    throw new Error('Не удалось получить данные.');
  }
}

export async function createRecord(payload: MaintenanceRecordInput): Promise<MaintenanceRecord> {
  const { createUrl, readUrl } = resolveConfig();
  const url = createUrl;

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[maintenance] POST url:', url);
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      validateStatus: status => status >= 200 && status < 300 || status === 204
    });

    if (response.status === 204 || response.data === undefined || response.data === '') {
      return {
        id: undefined,
        date: payload.date,
        procedure: payload.procedure,
        mileage: payload.mileage
      };
    }

    const data = response.data;

    return {
      id: data.id ?? data._id,
      date: data.date ?? payload.date,
      procedure: data.procedure ?? payload.procedure,
      mileage: Number(data.mileage ?? payload.mileage)
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404 || status === 405) {
        return appendRecordViaFileApi(readUrl, payload);
      }
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 405) {
        throw new Error('Сервер не принимает POST-запросы. Проверьте путь /api/* на сервере.');
      }
      const message = status ? `Не удалось сохранить запись (${status})` : 'Не удалось сохранить запись.';
      throw new Error(message);
    }

    throw new Error('Не удалось сохранить запись.');
  }
}

async function appendRecordViaFileApi(readUrl: string, payload: MaintenanceRecordInput): Promise<MaintenanceRecord> {
  let parsedRead: URL;
  try {
    parsedRead = toAbsoluteUrl(readUrl);
  } catch {
    throw new Error('Не удалось сохранить запись: невалидный адрес данных.');
  }

  const segments = parsedRead.pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) {
    throw new Error('Не удалось сохранить запись: неизвестный файл данных.');
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

    const updatedData = [...existing.data, normalizeRecord(payload)];

    await axios.put(saveUrl, updatedData, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    return normalizeRecord(payload);
  } catch (fallbackError) {
    if (axios.isAxiosError(fallbackError)) {
      const status = fallbackError.response?.status;
      const message = status ? `Не удалось сохранить запись (${status})` : 'Не удалось сохранить запись.';
      throw new Error(message);
    }

    if (fallbackError instanceof Error) {
      throw fallbackError;
    }

    throw new Error('Не удалось сохранить запись.');
  }
}
