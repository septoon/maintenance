import axios from 'axios';
import { SalaryMonth } from '../types';

const SALARY_API_URL = process.env.REACT_APP_API_SALARY;

function ensureSalaryApiUrl(): string {
  if (!SALARY_API_URL) {
    throw new Error('Не указан адрес сервера. Добавьте REACT_APP_API_SALARY в .env.');
  }
  return SALARY_API_URL;
}

function normalizeMonth(raw: any): SalaryMonth {
  const entries = Array.isArray(raw?.entries) ? raw.entries : [];

  return {
    month: String(raw?.month ?? ''),
    entries: entries.map((entry: any) => ({
      date: String(entry?.date ?? ''),
      baseSalary: Number(entry?.baseSalary ?? 0),
      weekendPay: Number(entry?.weekendPay ?? 0)
    }))
  };
}

export async function fetchSalaryMonths(): Promise<SalaryMonth[]> {
  const url = ensureSalaryApiUrl();

  try {
    const response = await axios.get(url, {
      headers: {
        Accept: 'application/json'
      },
      responseType: 'json'
    });

    const data = response.data;

    if (!Array.isArray(data)) {
      throw new Error('Ответ сервера должен быть массивом записей зарплаты.');
    }

    return data.map(normalizeMonth);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = status
        ? `Не удалось получить данные зарплаты (${status})`
        : 'Не удалось получить данные зарплаты.';
      throw new Error(message);
    }

    throw new Error('Не удалось получить данные зарплаты.');
  }
}
