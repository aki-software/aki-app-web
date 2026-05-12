export const PASSWORD_RESET_EMAIL_OPTIONS = {
  attempts: 3,
  backoffMs: 60_000,
  backoffType: 'exponential',
  timeoutMs: 20_000,
  concurrencyKey: 'email',
  concurrencyLimit: 10,
  template: 'password-reset',
  subject: 'Restablecé tu contraseña de A.kit',
} as const;
