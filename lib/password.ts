import bcrypt from "bcryptjs";

// ~200-300ms per hash on Vercel
const BCRYPT_ROUNDS = 12;

export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password-rules";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
