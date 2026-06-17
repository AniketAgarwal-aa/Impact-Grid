export const SUPER_ADMIN_EMAILS = [
  "admin1@impactstudio.com",
  "admin2@impactstudio.com",
] as const;

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(
    email.toLowerCase() as (typeof SUPER_ADMIN_EMAILS)[number],
  );
}

export function isProtectedAdmin(email?: string | null): boolean {
  return isSuperAdmin(email);
}
