import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import * as dotenv from 'dotenv';
import { Session } from '../sessions/entities/session.entity';
import { SessionResult } from '../sessions/entities/session-result.entity';
import { SessionSwipe } from '../sessions/entities/session-swipe.entity';
import { VocationalCategory } from '../categories/entities/vocational-category.entity';

// Cargar .env manualmente si se ejecuta desde TypeORM CLI
dotenv.config();

export const typeOrmConfig: PostgresConnectionOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'test_user',
  password: process.env.DATABASE_PASSWORD || 'test_password',
  database: process.env.DATABASE_NAME || 'akit_db',
  entities: [Session, SessionResult, SessionSwipe, VocationalCategory],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
};

export default new DataSource(typeOrmConfig);
