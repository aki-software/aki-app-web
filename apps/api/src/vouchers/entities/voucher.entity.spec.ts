import { Voucher, VoucherStatus } from './voucher.entity';
import { Institution } from '../../institutions/entities/institution.entity';

describe('Voucher Entity', () => {
  it('should create a voucher instance with default status', () => {
    const voucher = new Voucher();
    voucher.code = 'ABCD-1234';
    voucher.institutionId = 'inst-uuid';
    
    expect(voucher).toBeDefined();
    expect(voucher.code).toBe('ABCD-1234');
    expect(voucher.status).toBe(VoucherStatus.AVAILABLE);
  });

  it('should handle institution relationship', () => {
    const voucher = new Voucher();
    const inst = new Institution();
    inst.id = 'inst-uuid';
    inst.name = 'Test Inst';
    
    voucher.institution = inst;
    expect(voucher.institution).toBeDefined();
    expect(voucher.institution.name).toBe('Test Inst');
  });

  it('should allow setting different statuses', () => {
    const voucher = new Voucher();
    voucher.status = VoucherStatus.REDEEMED;
    expect(voucher.status).toBe(VoucherStatus.REDEEMED);
  });
});
