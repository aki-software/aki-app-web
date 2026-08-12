import { Voucher } from './voucher.entity';

describe('Voucher', () => {
  it('binds an unassigned voucher to the first authenticated Android email', () => {
    const voucher = new Voucher();
    voucher.assignedPatientEmail = null;

    voucher.bindToAuthenticatedEmail(' Patient@Example.com ');

    expect(voucher.assignedPatientEmail).toBe('patient@example.com');
  });

  it('rejects a different authenticated Android email after binding', () => {
    const voucher = new Voucher();
    voucher.assignedPatientEmail = 'patient@example.com';

    expect(() => voucher.bindToAuthenticatedEmail('other@example.com')).toThrow(
      'Voucher is bound to a different Android email.',
    );
  });
});
