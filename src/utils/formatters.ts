/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats a number as Brazilian Real (BRL): R$ 100.000,00
 */
export function formatBRL(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formats a number as US Dollar (USD): US$ 10,000.00
 */
export function formatUSD(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'US$ 0.00';
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
  // Custom prefix to match exact requirement "US$ 10,000.00"
  return formatted.replace('$', 'US$ ');
}

/**
 * Formats percentage: +12,50% or -3,40%
 */
export function formatPercent(value: number | undefined | null, includeSign: boolean = true): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00%';
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2).replace('.', ',')}%`;
}

/**
 * Formats ISO date (YYYY-MM-DD) to Brazilian date format: DD/MM/YYYY
 */
export function formatDateBR(dateStr: string | undefined | null): string {
  if (!dateStr) return '--/--/----';
  // Handle datetime or date string
  const cleanDate = dateStr.slice(0, 10);
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Formats YYYY-MM to Brazilian month name and year (e.g. "Outubro / 2026")
 */
export function formatYearMonthBR(ymStr: string | undefined | null): string {
  if (!ymStr) return '';
  const [year, month] = ymStr.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const idx = parseInt(month, 10) - 1;
  return `${months[idx] || month} de ${year}`;
}
