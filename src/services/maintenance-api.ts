import axios from 'axios';
import { MaintenancePart, MaintenanceRecord, MaintenanceRecordInput } from '../types';

const API_URL = process.env.REACT_APP_API_URL;

type ApiConfig = {
  readUrl: string;
  createUrl: string;
  updateUrl: string;
};

type ApiOverrides = {
  post: string | null;
  put: string | null;
};

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

function extractOverrides(parsed: URL): ApiOverrides {
  const overrides: ApiOverrides = {
    post: null,
    put: null
  };

  (['post', 'put'] as const).forEach(key => {
    if (parsed.searchParams.has(key)) {
      overrides[key] = parsed.searchParams.get(key) ?? null;
      parsed.searchParams.delete(key);
    }
  });

  if (parsed.hash) {
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    (['post', 'put'] as const).forEach(key => {
      if (!overrides[key] && hashParams.has(key)) {
        overrides[key] = hashParams.get(key) ?? null;
      }
      hashParams.delete(key);
    });
    const remainingHash = hashParams.toString();
    parsed.hash = remainingHash ? `#${remainingHash}` : '';
  }

  return overrides;
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
    console.warn(
      'Не удалось вычислить адрес сохранения. Используем REACT_APP_API_URL как есть.',
      error
    );
    return parsedInput.toString();
  }
}

function resolveConfig(): ApiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const baseUrl = ensureApiUrl();
  const parsed = toAbsoluteUrl(baseUrl);
  const overrides = extractOverrides(parsed);
  const readUrl = parsed.toString();
  const createUrl = overrides.post
    ? toAbsoluteUrl(overrides.post, parsed.origin).toString()
    : buildDefaultCreateUrl(parsed);
  const updateUrl = overrides.put
    ? toAbsoluteUrl(overrides.put, parsed.origin).toString()
    : createUrl;

  cachedConfig = { readUrl, createUrl, updateUrl };
  return cachedConfig;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function createRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `mnt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePart(raw: any): MaintenancePart | null {
  const name = String(raw?.name ?? '').trim();
  const cost = toNullableNumber(raw?.cost);

  if (!name || cost === null || cost < 0) {
    return null;
  }

  return { name, cost };
}

function normalizeParts(raw: unknown): MaintenancePart[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const result: MaintenancePart[] = [];
  raw.forEach(item => {
    const part = normalizePart(item);
    if (part) {
      result.push(part);
    }
  });
  return result;
}

function sumParts(parts?: MaintenancePart[] | null): number {
  return (parts ?? []).reduce((sum, part) => sum + (part.cost ?? 0), 0);
}

function deriveTotal(parts: MaintenancePart[], workCost: number | null): number | null {
  if (parts.length === 0 && workCost === null) {
    return null;
  }
  return sumParts(parts) + (workCost ?? 0);
}

function resolveParts(raw: any): MaintenancePart[] {
  const normalizedParts = normalizeParts(raw?.parts);
  if (normalizedParts.length > 0) {
    return normalizedParts;
  }

  const legacyPartsCost = toNullableNumber(raw?.partsCost);
  if (legacyPartsCost === null || legacyPartsCost < 0) {
    return [];
  }

  return [{ name: 'Запчасти', cost: legacyPartsCost }];
}

function normalizeRecord(raw: any): MaintenanceRecord {
  const parts = resolveParts(raw);
  const workCost = toNullableNumber(raw?.workCost);
  const totalCost = toNullableNumber(raw?.totalCost);

  return {
    id: raw?.id ?? raw?._id,
    date: String(raw?.date ?? ''),
    procedure: String(raw?.procedure ?? ''),
    mileage: Number(raw?.mileage ?? 0),
    parts,
    workCost,
    totalCost: totalCost ?? deriveTotal(parts, workCost)
  };
}

function normalizeInput(input: MaintenanceRecordInput): MaintenanceRecord {
  const parts = normalizeParts(input.parts);
  const workCost = toNullableNumber(input.workCost);

  return {
    id: undefined,
    date: String(input.date ?? ''),
    procedure: String(input.procedure ?? ''),
    mileage: Number(input.mileage ?? 0),
    parts,
    workCost,
    totalCost: deriveTotal(parts, workCost)
  };
}

function toRequestPayload(record: MaintenanceRecord): Record<string, unknown> {
  const parts = normalizeParts(record.parts);
  const partsCost = parts.length > 0 ? sumParts(parts) : null;

  return {
    ...(record.id ? { id: record.id } : {}),
    date: record.date,
    procedure: record.procedure,
    mileage: record.mileage,
    parts,
    partsCost,
    workCost: record.workCost ?? null
  };
}

function appendIdToUrl(baseUrl: string, id: string): string {
  const parsed = toAbsoluteUrl(baseUrl);
  parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}/${encodeURIComponent(id)}`;
  return parsed.toString();
}

function buildSafeWriteError(operation: 'создать' | 'обновить'): Error {
  return new Error(
    `Безопасный режим: нельзя ${operation} запись через полный перезапись JSON. ` +
      'Настройте точечный API endpoint для POST/PUT (например, через параметры post/put в REACT_APP_API_URL).'
  );
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

    if (!Array.isArray(response.data)) {
      throw new Error('Ответ сервера должен быть массивом записей.');
    }

    return response.data.map(normalizeRecord);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = status
        ? `Не удалось получить данные (${status})`
        : 'Не удалось получить данные.';
      throw new Error(message);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Не удалось получить данные.');
  }
}

export async function createRecord(input: MaintenanceRecordInput): Promise<MaintenanceRecord> {
  const { createUrl } = resolveConfig();
  const normalized = normalizeInput(input);
  const recordForCreate: MaintenanceRecord = { ...normalized, id: createRecordId() };
  const payload = toRequestPayload(recordForCreate);

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[maintenance] POST url:', createUrl);
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
      return recordForCreate;
    }

    const created = normalizeRecord({ ...recordForCreate, ...payload, ...response.data });
    if (!created.id) {
      created.id = recordForCreate.id;
    }
    return created;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404 || status === 405) {
        throw buildSafeWriteError('создать');
      }
      const message = status
        ? `Не удалось сохранить запись (${status})`
        : 'Не удалось сохранить запись.';
      throw new Error(message);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Не удалось сохранить запись.');
  }
}

export async function updateRecord(
  target: MaintenanceRecord,
  input: MaintenanceRecordInput
): Promise<MaintenanceRecord> {
  const { updateUrl } = resolveConfig();
  const normalized = normalizeInput(input);
  const payload = toRequestPayload({ ...normalized, id: target.id });

  if (!target.id) {
    throw new Error(
      'Безопасный режим: нельзя обновить запись без id. Нужен точечный endpoint и id записи.'
    );
  }

  try {
    const response = await axios.put(appendIdToUrl(updateUrl, String(target.id)), payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      validateStatus: status => (status >= 200 && status < 300) || status === 204
    });

    if (response.status === 204 || response.data === undefined || response.data === '') {
      return { ...normalized, id: target.id };
    }

    const updated = normalizeRecord({ ...target, ...payload, ...response.data });
    if (!updated.id && target.id) {
      updated.id = target.id;
    }
    return updated;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404 || status === 405) {
        throw buildSafeWriteError('обновить');
      }
      const message = status
        ? `Не удалось обновить запись (${status})`
        : 'Не удалось обновить запись.';
      throw new Error(message);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Не удалось обновить запись.');
  }
}
