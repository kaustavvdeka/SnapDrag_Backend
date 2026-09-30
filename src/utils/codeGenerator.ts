import crypto from 'crypto';

export const generateReservationCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid 0/O, 1/I confusion
  let code = '';
  const bytes = crypto.randomBytes(5);
  for (let i = 0; i < 5; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `TRAD-${code}`;
};

export const generateSku = (prefix: string = 'SD'): string => {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    rand += chars[bytes[i] % chars.length];
  }
  return `${prefix.toUpperCase()}-${Date.now().toString().slice(-4)}${rand}`;
};
