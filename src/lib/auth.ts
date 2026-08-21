import bcrypt from "bcryptjs";

/** Password assigned to new staff records and used by the admin "Reset Password" action. */
export const DEFAULT_STAFF_PASSWORD = "P@ss1234";

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
