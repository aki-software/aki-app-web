import { Voucher } from './voucher.entity';
import { VoucherBatch } from './voucher-batch.entity';
import { VoucherBatchStatus, VoucherOwnerType, VoucherStatus } from './voucher.enums';

describe('Voucher Entity', () => {
  let voucher: Voucher;

  beforeEach(() => {
    voucher = new Voucher();
    voucher.code = 'ABCD1234';
    voucher.batchId = 'batch-uuid';
    voucher.ownerType = VoucherOwnerType.INSTITUTION;
    voucher.ownerInstitutionId = 'inst-uuid';
  });

  it('should initialize with AVAILABLE status', () => {
    expect(voucher.status).toBe(VoucherStatus.AVAILABLE);
  });

  describe('assignToPatient', () => {
    it('should assign a patient if voucher is AVAILABLE', () => {
      voucher.assignToPatient('John Doe', 'john@test.com');
      
      expect(voucher.status).toBe(VoucherStatus.SENT);
      expect(voucher.assignedPatientName).toBe('John Doe');
      expect(voucher.assignedPatientEmail).toBe('john@test.com');
      expect(voucher.sentAt).toBeInstanceOf(Date);
    });

    it('should throw an error if voucher is already assigned or used', () => {
      voucher.assignToPatient('John Doe', 'john@test.com'); // Sets to SENT
      
      expect(() => {
        voucher.assignToPatient('Jane Doe', 'jane@test.com');
      }).toThrow('Voucher is not available to be assigned.');
    });
  });

  describe('redeem', () => {
    it('should redeem an assigned voucher', () => {
      voucher.assignToPatient('John Doe', 'john@test.com');
      voucher.redeem('session-123');
      
      expect(voucher.status).toBe(VoucherStatus.USED);
      expect(voucher.redeemedSessionId).toBe('session-123');
      expect(voucher.redeemedAt).toBeInstanceOf(Date);
    });

    it('should allow redemption of an unassigned voucher directly if applicable', () => {
      voucher.redeem('session-123');
      expect(voucher.status).toBe(VoucherStatus.USED);
      expect(voucher.redeemedSessionId).toBe('session-123');
    });

    it('should throw if voucher is expired', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago
      voucher.expiresAt = pastDate;
      
      expect(() => {
        voucher.redeem('session-123');
      }).toThrow('Voucher has expired.');
      expect(voucher.status).toBe(VoucherStatus.EXPIRED);
    });
    
    it('should throw if voucher is already used', () => {
      voucher.redeem('session-123');
      expect(() => {
        voucher.redeem('session-456');
      }).toThrow('Voucher cannot be redeemed. Current status: USED');
    });
  });

  describe('revoke', () => {
    it('should revoke an available or assigned voucher and clear assignment data', () => {
      voucher.assignToPatient('John Doe', 'john@test.com');
      voucher.revoke();
      
      expect(voucher.status).toBe(VoucherStatus.REVOKED);
      expect(voucher.assignedPatientName).toBeNull();
      expect(voucher.assignedPatientEmail).toBeNull();
    });

    it('should throw an error if trying to revoke a USED voucher', () => {
      voucher.redeem('session-123');
      
      expect(() => {
        voucher.revoke();
      }).toThrow('Cannot revoke an already used voucher.');
    });
  });
});
