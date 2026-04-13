import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  appErrorSchema,
  listVoucherBatchesQuerySchema,
  listVouchersQuerySchema,
  redeemVoucherRequestSchema,
  redeemVoucherResponseSchema,
  voucherBatchCreateResultSchema,
  voucherBatchDetailResponseSchema,
  voucherBatchListResponseSchema,
  voucherListResponseSchema,
} from './index';

const outputDir = join(process.cwd(), 'dist', 'json-schema');
mkdirSync(outputDir, { recursive: true });

const schemas: Record<string, unknown> = {
  AppError: zodToJsonSchema(appErrorSchema, 'AppError'),
  RedeemVoucherRequest: zodToJsonSchema(
    redeemVoucherRequestSchema,
    'RedeemVoucherRequest',
  ),
  RedeemVoucherResponse: zodToJsonSchema(
    redeemVoucherResponseSchema,
    'RedeemVoucherResponse',
  ),
  VoucherListResponse: zodToJsonSchema(
    voucherListResponseSchema,
    'VoucherListResponse',
  ),
  VoucherBatchListResponse: zodToJsonSchema(
    voucherBatchListResponseSchema,
    'VoucherBatchListResponse',
  ),
  VoucherBatchDetailResponse: zodToJsonSchema(
    voucherBatchDetailResponseSchema,
    'VoucherBatchDetailResponse',
  ),
  VoucherBatchCreateResult: zodToJsonSchema(
    voucherBatchCreateResultSchema,
    'VoucherBatchCreateResult',
  ),
  ListVouchersQuery: zodToJsonSchema(listVouchersQuerySchema, 'ListVouchersQuery'),
  ListVoucherBatchesQuery: zodToJsonSchema(
    listVoucherBatchesQuerySchema,
    'ListVoucherBatchesQuery',
  ),
};

writeFileSync(
  join(outputDir, 'vouchers.schemas.json'),
  `${JSON.stringify(schemas, null, 2)}\n`,
  'utf-8',
);

console.log(`Exported JSON Schemas to ${join(outputDir, 'vouchers.schemas.json')}`);
