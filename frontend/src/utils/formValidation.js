export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^(03\d{9}|92\d{10})$/;
export const CNIC_PATTERN = /^\d{5}-\d{7}-\d$/;

export function sanitizeEmailInput(value) {
  return String(value || '').trim().toLowerCase();
}

export function sanitizePhoneInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('92')) {
    return digits.slice(0, 12);
  }
  if (digits.startsWith('0')) {
    return digits.slice(0, 11);
  }
  return digits.slice(0, 12);
}

export function isValidPhone(value) {
  return PHONE_PATTERN.test(sanitizePhoneInput(value));
}

export function sanitizeCnicInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function isValidCnic(value) {
  return CNIC_PATTERN.test(String(value || ''));
}

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim());
}
