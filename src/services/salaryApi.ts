import axios from 'axios';
import { SalaryEntry, SalaryEntryInput, SalaryMonth } from '../types';

const SALARY_API_URL = process.env.REACT_APP_API_SALARY;

type SalaryApiConfig = {
  readUrl: string;
  createUrl: string;
  updateUrl: string;
  deleteUrl: string;
};

type SalaryApiOverrides = {
  post: string | null;
  put: string | null;
  delete: string | null;
};

let cachedConfig: SalaryApiConfig | null = null;

function ensureSalaryApiUrl(): string {
  if (!SALARY_API_URL) {
    throw new Error('Не указан адрес сервера. Добавьте REACT_APP_API_SALARY в .env.');
  }
  return SALARY_API_URL;
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

function extractOverrides(parsed: URL): SalaryApiOverrides {
  const overrides: SalaryApiOverrides = {
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
      const resourceName = segments[segments.length - 1] ?? 'salary';
      parsed.pathname = `/api/${resourceName}`;
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    }

    return parsed.toString();
  } catch (error) {
    console.warn(
      'Не удалось вычислить адрес сохранения. Используем REACT_APP_API_SALARY как есть.',
      error
    );
    return parsedInput.toString();
  }
}

function resolveConfig(): SalaryApiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const baseUrl = ensureSalaryApiUrl();
  const parsed = toAbsoluteUrl(baseUrl);
  const overrides = extractOverrides(parsed);

  const readUrl = parsed.toString();
  const createUrl = overrides.post
    ? toAbsoluteUrl(overrides.post, parsed.origin).toString()
    : buildDefaultCreateUrl(parsed);
  const updateUrl = overrides.put
    ? toAbsoluteUrl(overrides.put, parsed.origin).toString()
    : createUrl;
  const deleteUrl = overrides.delete
    ? toAbsoluteUrl(overrides.delete, parsed.origin).toString()
    : createUrl;

  cachedConfig = { readUrl, createUrl, updateUrl, deleteUrl };
  return cachedConfig;
}

function normalizeEntry(raw: any): SalaryEntry {
  return {
    id: raw?.id ?? raw?._id,
    date: String(raw?.date ?? ''),
    baseSalary: Number(raw?.baseSalary ?? 0),
    weekendPay: Number(raw?.weekendPay ?? 0)
  };
}

function normalizeMonth(raw: any): SalaryMonth {
  const entries = Array.isArray(raw?.entries) ? raw.entries : [];

  return {
    month: String(raw?.month ?? ''),
    entries: entries.map(normalizeEntry)
  };
}

function normalizeInput(input: SalaryEntryInput): SalaryEntry {
  return {
    date: String(input.date ?? ''),
    baseSalary: Number(input.baseSalary),
    weekendPay:
      input.weekendPay !== undefined && input.weekendPay !== null
        ? Number(input.weekendPay)
        : 0
  };
}

function validateSalaryEntry(entry: SalaryEntry): void {
  if (!entry.date) {
    throw new Error('Укажите дату выплаты.');
  }

  if (Number.isNaN(entry.baseSalary) || entry.baseSalary < 0) {
    throw new Error('Некорректное значение оклада.');
  }

  if (Number.isNaN(entry.weekendPay) || entry.weekendPay < 0) {
    throw new Error('Некорректное значение оплаты за выходной.');
  }
}

function toRequestPayload(entry: SalaryEntry): Record<string, unknown> {
  return {
    date: entry.date,
    baseSalary: entry.baseSalary,
    weekendPay: entry.weekendPay
  };
}

function appendIdToUrl(baseUrl: string, id: string): string {
  const parsed = toAbsoluteUrl(baseUrl);
  parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}/${encodeURIComponent(id)}`;
  return parsed.toString();
}

function sameNumber(left: number, right: number): boolean {
  return Number(left) === Number(right);
}

function isSameSalaryEntry(entry: SalaryEntry, target: SalaryEntry): boolean {
  if (target.id && entry.id && String(target.id) === String(entry.id)) {
    return true;
  }

  return (
    entry.date === target.date &&
    sameNumber(entry.baseSalary, target.baseSalary) &&
    sameNumber(entry.weekendPay, target.weekendPay)
  );
}

function resolveSaveUrl(readUrl: string): string {
  let parsedRead: URL;
  try {
    parsedRead = toAbsoluteUrl(readUrl);
  } catch {
    throw new Error('Не удалось сохранить запись зарплаты: невалидный адрес данных.');
  }

  const segments = parsedRead.pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) {
    throw new Error('Не удалось сохранить запись зарплаты: неизвестный файл данных.');
  }

  const fileName = lastSegment.includes('.') ? lastSegment : `${lastSegment}.json`;
  return new URL(`/api/save/${fileName}`, parsedRead.origin).toString();
}

function monthFromDate(value: string): string {
  return value.slice(0, 7);
}

function normalizeMonthArray(raw: any): SalaryMonth[] {
  if (!Array.isArray(raw)) {
    throw new Error('Формат данных на сервере не поддерживает операции с зарплатой.');
  }

  return raw.map(normalizeMonth);
}

async function readSalaryMonthsForUpdate(readUrl: string): Promise<SalaryMonth[]> {
  const response = await axios.get(readUrl, {
    headers: { Accept: 'application/json' },
    responseType: 'json'
  });

  return normalizeMonthArray(response.data);
}

async function saveSalaryMonths(readUrl: string, months: SalaryMonth[]): Promise<void> {
  const saveUrl = resolveSaveUrl(readUrl);

  await axios.put(saveUrl, months, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });
}

function findSalaryEntryLocation(
  months: SalaryMonth[],
  target: SalaryEntry
): { monthIndex: number; entryIndex: number } | null {
  for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1) {
    const entryIndex = months[monthIndex].entries.findIndex(entry =>
      isSameSalaryEntry(entry, target)
    );

    if (entryIndex !== -1) {
      return { monthIndex, entryIndex };
    }
  }

  return null;
}

function upsertSalaryMonth(months: SalaryMonth[], entry: SalaryEntry): SalaryMonth[] {
  const monthKey = monthFromDate(entry.date);

  if (!monthKey || monthKey.length !== 7) {
    throw new Error('Некорректная дата выплаты.');
  }

  const existingMonthIndex = months.findIndex(item => item.month === monthKey);
  if (existingMonthIndex === -1) {
    months.push({ month: monthKey, entries: [entry] });
  } else {
    months[existingMonthIndex].entries.push(entry);
  }

  months.forEach(month => {
    month.entries.sort((a, b) => a.date.localeCompare(b.date));
  });
  months.sort((a, b) => a.month.localeCompare(b.month));

  return months;
}

export async function fetchSalaryMonths(): Promise<SalaryMonth[]> {
  const { readUrl } = resolveConfig();

  try {
    const response = await axios.get(readUrl, {
      headers: {
        Accept: 'application/json'
      },
      responseType: 'json'
    });

    return normalizeMonthArray(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = status
        ? `Не удалось получить данные зарплаты (${status})`
        : 'Не удалось получить данные зарплаты.';
      throw new Error(message);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Не удалось получить данные зарплаты.');
  }
}

export async function createSalaryEntry(input: SalaryEntryInput): Promise<SalaryEntry> {
  const { createUrl, readUrl } = resolveConfig();

  const payloadEntry = normalizeInput(input);
  validateSalaryEntry(payloadEntry);
  const payload = toRequestPayload(payloadEntry);

  try {
    const response = await axios.post(createUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      validateStatus: status => (status >= 200 && status < 300) || status === 204
    });

    if (response.status === 204 || response.data === undefined || response.data === '') {
      return payloadEntry;
    }

    const data = response.data;

    if (data && typeof data === 'object' && 'date' in data) {
      return normalizeEntry(data);
    }

    return payloadEntry;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404 || status === 405) {
        try {
          const months = await readSalaryMonthsForUpdate(readUrl);
          const updated = upsertSalaryMonth([...months], payloadEntry);
          await saveSalaryMonths(readUrl, updated);
          return payloadEntry;
        } catch (fallbackError) {
          if (axios.isAxiosError(fallbackError)) {
            const fallbackStatus = fallbackError.response?.status;
            const fallbackMessage = fallbackStatus
              ? `Не удалось сохранить запись зарплаты (${fallbackStatus})`
              : 'Не удалось сохранить запись зарплаты.';
            throw new Error(fallbackMessage);
          }
          if (fallbackError instanceof Error) {
            throw fallbackError;
          }
          throw new Error('Не удалось сохранить запись зарплаты.');
        }
      }

      const message = status
        ? `Не удалось сохранить запись зарплаты (${status})`
        : 'Не удалось сохранить запись зарплаты.';
      throw new Error(message);
    }

    throw new Error('Не удалось сохранить запись зарплаты.');
  }
}

export async function updateSalaryEntry(
  target: SalaryEntry,
  input: SalaryEntryInput
): Promise<SalaryEntry> {
  const { readUrl, updateUrl } = resolveConfig();

  const payloadEntry = normalizeInput(input);
  validateSalaryEntry(payloadEntry);
  const payload = toRequestPayload(payloadEntry);

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
        return { ...payloadEntry, id: target.id };
      }

      return normalizeEntry(response.data);
    }

    throw new Error('fallback');
  } catch (error) {
    if (error instanceof Error && error.message === 'fallback') {
      // continue to file fallback
    } else if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status !== 404 && status !== 405) {
        const message = status
          ? `Не удалось обновить запись зарплаты (${status})`
          : 'Не удалось обновить запись зарплаты.';
        throw new Error(message);
      }
    }

    try {
      const months = await readSalaryMonthsForUpdate(readUrl);
      const location = findSalaryEntryLocation(months, target);

      if (!location) {
        throw new Error('Запись зарплаты для обновления не найдена.');
      }

      const updatedMonths = months.map(month => ({
        month: month.month,
        entries: [...month.entries]
      }));

      const [removed] = updatedMonths[location.monthIndex].entries.splice(location.entryIndex, 1);
      if (!removed) {
        throw new Error('Запись зарплаты для обновления не найдена.');
      }

      if (updatedMonths[location.monthIndex].entries.length === 0) {
        updatedMonths.splice(location.monthIndex, 1);
      }

      const updatedEntry: SalaryEntry = {
        ...payloadEntry,
        id: target.id ?? removed.id
      };

      const result = upsertSalaryMonth(updatedMonths, updatedEntry);
      await saveSalaryMonths(readUrl, result);
      return updatedEntry;
    } catch (fallbackError) {
      if (axios.isAxiosError(fallbackError)) {
        const status = fallbackError.response?.status;
        const message = status
          ? `Не удалось обновить запись зарплаты (${status})`
          : 'Не удалось обновить запись зарплаты.';
        throw new Error(message);
      }

      if (fallbackError instanceof Error) {
        throw fallbackError;
      }

      throw new Error('Не удалось обновить запись зарплаты.');
    }
  }
}

export async function deleteSalaryEntry(target: SalaryEntry): Promise<void> {
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
          ? `Не удалось удалить запись зарплаты (${status})`
          : 'Не удалось удалить запись зарплаты.';
        throw new Error(message);
      }
    }

    try {
      const months = await readSalaryMonthsForUpdate(readUrl);
      const location = findSalaryEntryLocation(months, target);

      if (!location) {
        throw new Error('Запись зарплаты для удаления не найдена.');
      }

      const updatedMonths = months.map(month => ({
        month: month.month,
        entries: [...month.entries]
      }));

      updatedMonths[location.monthIndex].entries.splice(location.entryIndex, 1);

      if (updatedMonths[location.monthIndex].entries.length === 0) {
        updatedMonths.splice(location.monthIndex, 1);
      }

      await saveSalaryMonths(readUrl, updatedMonths);
    } catch (fallbackError) {
      if (axios.isAxiosError(fallbackError)) {
        const status = fallbackError.response?.status;
        const message = status
          ? `Не удалось удалить запись зарплаты (${status})`
          : 'Не удалось удалить запись зарплаты.';
        throw new Error(message);
      }

      if (fallbackError instanceof Error) {
        throw fallbackError;
      }

      throw new Error('Не удалось удалить запись зарплаты.');
    }
  }
}
