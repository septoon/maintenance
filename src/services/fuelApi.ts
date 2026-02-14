import axios from 'axios';
import { FuelRecord, FuelRecordInput } from '../types';

const GAS_API_URL = process.env.REACT_APP_API_GAS;

type FuelApiConfig = {
  readUrl: string;
  createUrl: string;
  updateUrl: string;
  deleteUrl: string;
  preferFileSaveMode: boolean;
};

type FuelApiOverrides = {
  post: string | null;
  put: string | null;
  delete: string | null;
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

function extractOverrides(parsed: URL): FuelApiOverrides {
  const overrides: FuelApiOverrides = {
    post: null,
    put: null,
    delete: null
  };

  (['post', 'put', 'delete'] as const).forEach(key => {
    if (parsed.searchParams.has(key)) {
      overrides[key] = parsed.searchParams.get(key) ?? null;
      parsed.searchParams.delete(key);
    }
  });

  if (parsed.hash) {
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    (['post', 'put', 'delete'] as const).forEach(key => {
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
  const readPath = parsed.pathname;
  const overrides = extractOverrides(parsed);
  const readUrl = parsed.toString();
  const preferFileSaveMode = readPath.endsWith('.json') && !overrides.post;
  const createUrl = overrides.post
    ? toAbsoluteUrl(overrides.post, parsed.origin).toString()
    : buildDefaultCreateUrl(parsed);
  const updateUrl = overrides.put
    ? toAbsoluteUrl(overrides.put, parsed.origin).toString()
    : createUrl;
  const deleteUrl = overrides.delete
    ? toAbsoluteUrl(overrides.delete, parsed.origin).toString()
    : createUrl;

  cachedConfig = { readUrl, createUrl, updateUrl, deleteUrl, preferFileSaveMode };
  return cachedConfig;
}

function normalizeFuelRecord(raw: any): FuelRecord {
  const rawRecordType = raw?.recordType === 'adjustment' ? 'adjustment' : 'fuel';
  const rawAdjustmentKind =
    raw?.adjustmentKind === 'compensation_payment' || raw?.adjustmentKind === 'debt_deduction'
      ? raw.adjustmentKind
      : null;

  return {
    id: raw?.id ?? raw?._id,
    recordType: rawRecordType,
    adjustmentKind: rawAdjustmentKind,
    monthKey: raw?.monthKey ? String(raw.monthKey) : null,
    amount: raw?.amount !== undefined && raw?.amount !== null ? Number(raw.amount) : null,
    carryoverDebtRub:
      raw?.carryoverDebtRub !== undefined && raw?.carryoverDebtRub !== null
        ? Number(raw.carryoverDebtRub)
        : null,
    comment: raw?.comment !== undefined && raw?.comment !== null ? String(raw.comment) : null,
    date: String(raw?.date ?? ''),
    mileage: raw?.mileage !== undefined && raw?.mileage !== null ? Number(raw.mileage) : null,
    liters: raw?.liters !== undefined && raw?.liters !== null ? Number(raw.liters) : null,
    fuelCost: raw?.fuelCost !== undefined && raw?.fuelCost !== null ? Number(raw.fuelCost) : null
  };
}

function normalizeFuelInput(input: FuelRecordInput): FuelRecord {
  const recordType = input.recordType === 'adjustment' ? 'adjustment' : 'fuel';
  const adjustmentKind =
    input.adjustmentKind === 'compensation_payment' || input.adjustmentKind === 'debt_deduction'
      ? input.adjustmentKind
      : null;

  return {
    recordType,
    adjustmentKind,
    monthKey: input.monthKey ? String(input.monthKey).slice(0, 7) : null,
    amount: input.amount !== undefined && input.amount !== null ? Number(input.amount) : null,
    carryoverDebtRub:
      input.carryoverDebtRub !== undefined && input.carryoverDebtRub !== null
        ? Number(input.carryoverDebtRub)
        : null,
    comment: input.comment !== undefined && input.comment !== null ? String(input.comment) : null,
    date: String(input.date ?? ''),
    mileage:
      input.mileage !== undefined && input.mileage !== null ? Number(input.mileage) : null,
    liters: input.liters !== undefined && input.liters !== null ? Number(input.liters) : null,
    fuelCost:
      input.fuelCost !== undefined && input.fuelCost !== null ? Number(input.fuelCost) : null
  };
}

function validateFuelRecord(record: FuelRecord): void {
  const recordType = record.recordType === 'adjustment' ? 'adjustment' : 'fuel';
  const adjustmentKind = record.adjustmentKind ?? null;
  const mileage = record.mileage ?? null;
  const liters = record.liters ?? null;
  const fuelCost = record.fuelCost ?? null;
  const amount = record.amount ?? null;
  const monthKey = record.monthKey?.trim() ?? null;
  const carryoverDebtRub = record.carryoverDebtRub ?? null;

  if (!record.date) {
    throw new Error(
      recordType === 'adjustment' ? 'Укажите дату корректировки.' : 'Укажите дату записи топлива.'
    );
  }

  if (recordType === 'fuel') {
    if (mileage === null && liters === null && fuelCost === null) {
      throw new Error('Укажите пробег, бензин или стоимость перед отправкой.');
    }

    if (mileage !== null && (Number.isNaN(mileage) || mileage < 0)) {
      throw new Error('Некорректное значение пробега.');
    }

    if (liters !== null && (Number.isNaN(liters) || liters < 0)) {
      throw new Error('Некорректное значение количества топлива.');
    }

    if (fuelCost !== null && (Number.isNaN(fuelCost) || fuelCost < 0)) {
      throw new Error('Некорректное значение суммы заправки.');
    }
    return;
  }

  if (adjustmentKind !== 'compensation_payment' && adjustmentKind !== 'debt_deduction') {
    throw new Error('Укажите тип корректировки.');
  }

  if (monthKey && !/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error('Некорректный месяц корректировки.');
  }

  if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
    throw new Error('Некорректная сумма корректировки.');
  }

  if (carryoverDebtRub !== null && (Number.isNaN(carryoverDebtRub) || carryoverDebtRub < 0)) {
    throw new Error('Некорректный остаток долга.');
  }

  if (liters !== null && (Number.isNaN(liters) || liters < 0)) {
    throw new Error('Некорректное значение литров в корректировке.');
  }

  if (adjustmentKind === 'compensation_payment' && amount === null) {
    throw new Error('Для выплаты укажите сумму.');
  }

  if (adjustmentKind === 'debt_deduction' && amount === null && liters === null) {
    throw new Error('Для вычета долга укажите сумму или литры.');
  }

  if (adjustmentKind !== 'debt_deduction' && carryoverDebtRub !== null) {
    throw new Error('Остаток долга доступен только для вычета долга.');
  }
}

function toRequestPayload(record: FuelRecord): Record<string, unknown> {
  return {
    date: record.date,
    recordType: record.recordType ?? 'fuel',
    adjustmentKind: record.adjustmentKind ?? null,
    monthKey: record.monthKey ?? null,
    amount: record.amount ?? null,
    carryoverDebtRub: record.carryoverDebtRub ?? null,
    comment: record.comment ?? null,
    mileage: record.mileage ?? null,
    liters: record.liters ?? null,
    fuelCost: record.fuelCost ?? null
  };
}

function appendIdToUrl(baseUrl: string, id: string): string {
  const parsed = toAbsoluteUrl(baseUrl);
  parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}/${encodeURIComponent(id)}`;
  return parsed.toString();
}

function sameNumber(left?: number | null, right?: number | null): boolean {
  const a = left ?? null;
  const b = right ?? null;
  if (a === null || b === null) {
    return a === b;
  }
  return Number(a) === Number(b);
}

function sameString(left?: string | null, right?: string | null): boolean {
  const a = left ?? null;
  const b = right ?? null;
  return a === b;
}

function isSameFuelRecord(record: FuelRecord, target: FuelRecord): boolean {
  if (target.id && record.id && String(target.id) === String(record.id)) {
    return true;
  }

  const recordType = record.recordType ?? 'fuel';
  const targetType = target.recordType ?? 'fuel';

  if (recordType !== targetType) {
    return false;
  }

  return (
    record.date === target.date &&
    sameString(record.adjustmentKind, target.adjustmentKind) &&
    sameString(record.monthKey, target.monthKey) &&
    sameString(record.comment, target.comment) &&
    sameNumber(record.amount, target.amount) &&
    sameNumber(record.carryoverDebtRub, target.carryoverDebtRub) &&
    sameNumber(record.mileage, target.mileage) &&
    sameNumber(record.liters, target.liters) &&
    sameNumber(record.fuelCost, target.fuelCost)
  );
}

function resolveSaveUrl(readUrl: string): string {
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
  return new URL(`/api/save/${fileName}`, parsedRead.origin).toString();
}

async function readRawFuelRecords(readUrl: string): Promise<any[]> {
  const existing = await axios.get(readUrl, {
    headers: { Accept: 'application/json' },
    responseType: 'json'
  });

  if (!Array.isArray(existing.data)) {
    throw new Error('Формат данных на сервере не поддерживает операции с записями топлива.');
  }

  return existing.data;
}

async function saveRawFuelRecords(readUrl: string, records: any[]): Promise<void> {
  const saveUrl = resolveSaveUrl(readUrl);

  await axios.put(saveUrl, records, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });
}

function findFuelRecordIndex(rawRecords: any[], target: FuelRecord): number {
  return rawRecords.findIndex(item => isSameFuelRecord(normalizeFuelRecord(item), target));
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
      const message = status
        ? `Не удалось получить данные топлива (${status})`
        : 'Не удалось получить данные топлива.';
      throw new Error(message);
    }

    throw new Error('Не удалось получить данные топлива.');
  }
}

export async function createFuelRecord(input: FuelRecordInput): Promise<FuelRecord> {
  const { createUrl, readUrl, preferFileSaveMode } = resolveConfig();
  const normalized = normalizeFuelInput(input);
  validateFuelRecord(normalized);

  const payload = toRequestPayload(normalized);

  if (preferFileSaveMode) {
    try {
      const existing = await readRawFuelRecords(readUrl);
      const updated = [...existing, payload];
      await saveRawFuelRecords(readUrl, updated);
      return normalized;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = status
          ? `Не удалось сохранить данные топлива (${status})`
          : 'Не удалось сохранить данные топлива.';
        throw new Error(message);
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Не удалось сохранить данные топлива.');
    }
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
        try {
          const existing = await readRawFuelRecords(readUrl);
          const updated = [...existing, payload];
          await saveRawFuelRecords(readUrl, updated);
          return normalized;
        } catch (fallbackError) {
          if (axios.isAxiosError(fallbackError)) {
            const fallbackStatus = fallbackError.response?.status;
            const fallbackMessage = fallbackStatus
              ? `Не удалось сохранить данные топлива (${fallbackStatus})`
              : 'Не удалось сохранить данные топлива.';
            throw new Error(fallbackMessage);
          }
          if (fallbackError instanceof Error) {
            throw fallbackError;
          }
          throw new Error('Не удалось сохранить данные топлива.');
        }
      }

      const message = status
        ? `Не удалось сохранить данные топлива (${status})`
        : 'Не удалось сохранить данные топлива.';
      throw new Error(message);
    }

    throw new Error('Не удалось сохранить данные топлива.');
  }
}

export async function updateFuelRecord(target: FuelRecord, input: FuelRecordInput): Promise<FuelRecord> {
  const { readUrl, updateUrl } = resolveConfig();
  const normalized = normalizeFuelInput(input);
  validateFuelRecord(normalized);

  const payload = toRequestPayload(normalized);

  try {
    if (target.id) {
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

      return normalizeFuelRecord(response.data);
    }

    throw new Error('fallback');
  } catch (error) {
    if (error instanceof Error && error.message === 'fallback') {
      // continue to file fallback
    } else if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status !== 404 && status !== 405) {
        const message = status
          ? `Не удалось обновить запись топлива (${status})`
          : 'Не удалось обновить запись топлива.';
        throw new Error(message);
      }
    }

    try {
      const existing = await readRawFuelRecords(readUrl);
      const index = findFuelRecordIndex(existing, target);

      if (index === -1) {
        throw new Error('Запись топлива для обновления не найдена.');
      }

      const updated = [...existing];
      const existingRecord = normalizeFuelRecord(updated[index]);
      updated[index] = {
        ...updated[index],
        ...payload,
        id: existingRecord.id ?? target.id,
        _id: (updated[index] as any)?._id
      };

      await saveRawFuelRecords(readUrl, updated);
      return { ...normalized, id: existingRecord.id ?? target.id };
    } catch (fallbackError) {
      if (axios.isAxiosError(fallbackError)) {
        const status = fallbackError.response?.status;
        const message = status
          ? `Не удалось обновить запись топлива (${status})`
          : 'Не удалось обновить запись топлива.';
        throw new Error(message);
      }
      if (fallbackError instanceof Error) {
        throw fallbackError;
      }
      throw new Error('Не удалось обновить запись топлива.');
    }
  }
}

export async function deleteFuelRecord(target: FuelRecord): Promise<void> {
  const { readUrl, deleteUrl } = resolveConfig();

  try {
    if (target.id) {
      await axios.delete(appendIdToUrl(deleteUrl, String(target.id)), {
        headers: {
          Accept: 'application/json'
        },
        validateStatus: status => (status >= 200 && status < 300) || status === 204
      });
      return;
    }

    throw new Error('fallback');
  } catch (error) {
    if (error instanceof Error && error.message === 'fallback') {
      // continue to file fallback
    } else if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status !== 404 && status !== 405) {
        const message = status
          ? `Не удалось удалить запись топлива (${status})`
          : 'Не удалось удалить запись топлива.';
        throw new Error(message);
      }
    }

    try {
      const existing = await readRawFuelRecords(readUrl);
      const index = findFuelRecordIndex(existing, target);

      if (index === -1) {
        throw new Error('Запись топлива для удаления не найдена.');
      }

      const updated = [...existing];
      updated.splice(index, 1);
      await saveRawFuelRecords(readUrl, updated);
    } catch (fallbackError) {
      if (axios.isAxiosError(fallbackError)) {
        const status = fallbackError.response?.status;
        const message = status
          ? `Не удалось удалить запись топлива (${status})`
          : 'Не удалось удалить запись топлива.';
        throw new Error(message);
      }
      if (fallbackError instanceof Error) {
        throw fallbackError;
      }
      throw new Error('Не удалось удалить запись топлива.');
    }
  }
}
