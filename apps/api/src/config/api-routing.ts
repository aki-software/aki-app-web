import { INestApplication, RequestMethod } from '@nestjs/common';

const globalPrefixExclusions = [
  { path: 'health', method: RequestMethod.ALL },
  { path: 'health/(.*)', method: RequestMethod.ALL },
  { path: 'api/v1/health', method: RequestMethod.ALL },
  { path: 'api/v1/health/(.*)', method: RequestMethod.ALL },
  '/',
];

export function configureApiGlobalPrefix(app: INestApplication): void {
  app.setGlobalPrefix('api/v1', { exclude: globalPrefixExclusions });
}
