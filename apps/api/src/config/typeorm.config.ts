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
import { PricingPlan } from '../payments/entities/pricing-plan.entity.js';
import { PaymentEvent } from '../payments/entities/payment-event.entity.js';
import { PaymentFulfillmentOutbox } from '../payments/entities/payment-fulfillment-outbox.entity.js';
import { CheckoutAttempt } from '../payments/entities/checkout-attempt.entity.js';
import { Report } from '../reports/entities/report.entity.js';
import { ReportGrant } from '../reports/entities/report-grant.entity.js';
import { ReportAccessAudit } from '../reports/entities/report-access-audit.entity.js';
import { ReportDelivery } from '../reports/entities/report-delivery.entity.js';
import { Patient } from '../patients/entities/patient.entity.js';

dotenv.config();

const databaseHost = process.env.DATABASE_HOST || 'localhost';
const databaseUrl = process.env.DATABASE_URL;
const isLocalDatabaseUrl = databaseUrl
  ? ['localhost', '127.0.0.1', '::1'].includes(new URL(databaseUrl).hostname)
  : false;

export const typeOrmConfig: PostgresConnectionOptions = databaseUrl
  ? {
      type: 'postgres',
      url: databaseUrl,
      entities: [
        Session,
        SessionResult,
        SessionSwipe,
        SessionMetrics,
        VocationalCategory,
        User,
        Patient,
        Institution,
        Voucher,
        VoucherBatch,
        TresAreasCombination,
        PricingPlan,
        PaymentEvent,
        PaymentFulfillmentOutbox,
        CheckoutAttempt,
        Report,
        ReportGrant,
        ReportAccessAudit,
        ReportDelivery,
      ],
      migrations: ['dist/migrations/[0-9]*.js'],
      migrationsTransactionMode: 'each',
      synchronize: false,
      ssl: isLocalDatabaseUrl ? false : { rejectUnauthorized: false },
    }
  : {
      type: 'postgres',
      host: databaseHost,
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
        Patient,
        Institution,
        Voucher,
        VoucherBatch,
        TresAreasCombination,
        PricingPlan,
        PaymentEvent,
        PaymentFulfillmentOutbox,
        CheckoutAttempt,
        Report,
        ReportGrant,
        ReportAccessAudit,
        ReportDelivery,
      ],
      migrations: ['dist/migrations/[0-9]*.js'],
      migrationsTransactionMode: 'each',
      synchronize: false,
      ssl: databaseHost !== 'localhost' ? { rejectUnauthorized: false } : false,
    };

export default new DataSource(typeOrmConfig);
