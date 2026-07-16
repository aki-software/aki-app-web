export const AUTH_ERROR_MESSAGES = {
  invalidCredentials: 'Credenciales inválidas',
  passwordNotConfigured: 'La cuenta todavía no activó su contraseña',
  invalidToken: 'Token inválido',
  expiredToken: 'Token expirado',
  invalidSession: 'Sesión inválida',
  samePassword: 'La nueva contraseña debe ser distinta a la actual',
  unauthorized: 'No autorizado',
  userNotFound: 'Usuario no encontrado',
  incorrectCurrentPassword: 'La contraseña actual es incorrecta',
  accountLocked:
    'Demasiados intentos fallidos. Cuenta bloqueada temporalmente por 15 minutos.',
} as const;

export const AUTH_INFO_MESSAGES = {
  passwordReset:
    'Si el email existe en la plataforma, vas a recibir instrucciones para restablecer tu contraseña.',
} as const;

export const AUTH_ADMIN = {
  id: '1',
  name: 'Administrador',
  institutionId: null,
} as const;

export const AUTH_RATE_LIMITS = {
  login: { limit: 10, windowMs: 60_000 },
  requestPasswordReset: { limit: 5, windowMs: 60_000 },
  resolveResetToken: { limit: 20, windowMs: 60_000 },
  resetPassword: { limit: 5, windowMs: 60_000 },
} satisfies Record<string, { limit: number; windowMs: number }>;

export const AUTH_ROLE_MESSAGES = {
  missingRole: 'No se encontró información de rol en la sesión',
  insufficientRole:
    'No tienes los permisos necesarios para acceder a este recurso',
} as const;

export const AUTH_JWT_MESSAGES = {
  firebaseMissingKid: 'Firebase token sin key id (kid)',
  firebaseProjectIdMissing:
    'No se pudo resolver FIREBASE_PROJECT_ID para validar token',
  firebaseIssuerInvalid: 'Issuer de Firebase inválido',
  firebaseAudienceInvalid: 'Audience de Firebase inválido',
  jwtHeaderMissing: 'JWT inválido: header ausente',
  jwtPayloadMissing: 'JWT inválido: payload ausente',
  firebaseCertFetchFailed: 'No se pudieron obtener certificados Firebase',
  firebaseKidNotFound: 'kid de Firebase no reconocido',
} as const;

export const AUTH_JWT_LOG_MESSAGES = {
  checkPrefix: 'JWT check',
  failedPrefix: 'JWT auth failed',
} as const;

export const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
