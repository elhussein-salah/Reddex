export const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export const E164_PHONE_ERROR_MESSAGE =
  'Phone must be in international format (E.164), e.g. +12025550198';

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s()-]/g, '');
}
