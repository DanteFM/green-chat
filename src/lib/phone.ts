export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '');
}

export function isValidPhone(digits: string): boolean {
  return /^\d{8,15}$/.test(digits);
}

export function formatPhone(digits: string): string {
  return `+${digits}`;
}
