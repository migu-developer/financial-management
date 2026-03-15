const CALLING_CODES: Record<string, string> = {
  CO: '57',
  US: '1',
  MX: '52',
  BR: '55',
  ES: '34',
  AR: '54',
  PE: '51',
  CL: '56',
  EC: '593',
  VE: '58',
  GB: '44',
  DE: '49',
  FR: '33',
  CA: '1',
  AU: '61',
};

export function getCountries(): string[] {
  return [
    'CO',
    'US',
    'MX',
    'BR',
    'ES',
    'AR',
    'PE',
    'CL',
    'EC',
    'VE',
    'GB',
    'DE',
    'FR',
    'CA',
    'AU',
  ];
}

export function getCountryCallingCode(code: string): string {
  return CALLING_CODES[code] ?? '1';
}

export function isValidPhoneNumber(phone: string): boolean {
  return phone.startsWith('+') && phone.replace(/\D/g, '').length >= 8;
}

export class AsYouType {
  constructor(public country?: string) {}
  input(text: string): string {
    return text;
  }
}
