import { VoucherBatch } from './voucher-batch.entity';
import { VoucherBatchStatus } from './voucher.enums';

describe('VoucherBatch Entity', () => {
  let batch: VoucherBatch;

  beforeEach(() => {
    batch = new VoucherBatch();
    batch.id = 'batch-uuid';
    batch.status = VoucherBatchStatus.PENDING;
  });

  describe('markAsPaid', () => {
    it('should mark batch as paid and store payment info', () => {
      batch.markAsPaid('stripe', 'pi_123');
      
      expect(batch.status).toBe(VoucherBatchStatus.PAID);
      expect(batch.paymentProvider).toBe('stripe');
      expect(batch.paymentReference).toBe('pi_123');
      expect(batch.paidAt).toBeInstanceOf(Date);
    });

    it('should not allow marking a cancelled batch as paid', () => {
      batch.status = VoucherBatchStatus.CANCELLED;
      
      expect(() => {
        batch.markAsPaid('stripe', 'pi_123');
      }).toThrow('Cannot pay for a cancelled batch.');
    });
  });

  describe('cancel', () => {
    it('should cancel a pending batch', () => {
      batch.cancel();
      expect(batch.status).toBe(VoucherBatchStatus.CANCELLED);
    });

    it('should not allow cancelling a paid batch', () => {
      batch.markAsPaid('stripe', 'pi_123');
      
      expect(() => {
        batch.cancel();
      }).toThrow('Cannot cancel an already paid batch.');
    });
  });
});
