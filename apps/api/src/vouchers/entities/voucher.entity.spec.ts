import {
  Voucher,
} from './voucher.entity';
import { VoucherBatch } from './voucher-batch.entity';
import {
  VoucherBatchStatus,
  VoucherOwnerType,
  VoucherStatus,
} from './voucher.enums';

describe('Voucher Entity', () => {
  it('should create a voucher instance with default status', () => {
    const voucher = new Voucher();
    voucher.code = 'ABCD-1234';
    voucher.batchId = 'batch-uuid';
    voucher.ownerType = VoucherOwnerType.INSTITUTION;
    voucher.ownerInstitutionId = 'inst-uuid';
    
    expect(voucher).toBeDefined();
    expect(voucher.code).toBe('ABCD-1234');
    expect(voucher.status).toBe(VoucherStatus.AVAILABLE);
  });

  it('should handle batch relationship', () => {
    const voucher = new Voucher();
    const batch = new VoucherBatch();
    batch.id = 'batch-uuid';
    batch.quantity = 10;
    batch.status = VoucherBatchStatus.PAID;
    
    voucher.batch = batch;
    expect(voucher.batch).toBeDefined();
    expect(voucher.batch.quantity).toBe(10);
  });

  it('should allow setting different statuses', () => {
    const voucher = new Voucher();
    voucher.status = VoucherStatus.USED;
    expect(voucher.status).toBe(VoucherStatus.USED);
  });
});
