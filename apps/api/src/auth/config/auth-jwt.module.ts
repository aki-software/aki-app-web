import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';

const DEFAULT_JWT_EXPIRATION = '12h';

export const AuthJwtModule = JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    secret: configService.getOrThrow<string>('JWT_SECRET'),
    signOptions: {
      expiresIn: resolveJwtExpiration(configService),
    },
  }),
});

function resolveJwtExpiration(
  configService: ConfigService,
): NonNullable<JwtSignOptions['expiresIn']> {
  const rawExpiration = configService.get<string>('JWT_EXPIRATION');
  return (rawExpiration?.trim() || DEFAULT_JWT_EXPIRATION) as NonNullable<
    JwtSignOptions['expiresIn']
  >;
}
