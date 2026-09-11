/** Return an international phone's digits for contact URLs, or absence for invalid input. */
export function getContactNumber(phone?: string): string | undefined {
  if (!phone || !/^\+?[\d\s().-]+$/.test(phone.trim())) return undefined;
  const digits = phone.replace(/\D/g, '');
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : undefined;
}
