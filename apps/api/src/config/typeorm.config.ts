import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import * as dotenv from 'dotenv';
import { Session } from '../sessions/entities/session.entity.js';
import { SessionResult } from '../sessions/entities/session-result.entity.js';
import { SessionSwipe } from '../sessions/entities/session-swipe.entity.js';
import { SessionMetrics } from '../sessions/entities/session-metrics.entity.js';
import { VocationalCategory } from '../categories/entities/vocational-category.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Institution } from '../institutions/entities/institution.entity.js';
import { Voucher } from '../vouchers/entities/voucher.entity.js';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import { TresAreasCombination } from '../tres-areas/entities/tres-areas-combination.entity.js';

dotenv.config();

export const typeOrmConfig: PostgresConnectionOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'test_user',
  password: process.env.DATABASE_PASSWORD || 'test_password',
  database: process.env.DATABASE_NAME || 'akit_db',
  entities: [
    Session,
    SessionResult,
    SessionSwipe,
    SessionMetrics,
    VocationalCategory,
    User,
    Institution,
    Voucher,
    VoucherBatch,
    TresAreasCombination,
  ],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  ssl:
    process.env.DATABASE_HOST !== 'localhost'
      ? { rejectUnauthorized: false }
      : false,
};

export default new DataSource(typeOrmConfig);
