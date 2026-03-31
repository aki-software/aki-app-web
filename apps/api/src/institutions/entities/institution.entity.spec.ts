import { Institution } from './institution.entity';
import { User } from '../../users/entities/user.entity';

describe('Institution Entity', () => {
  let institution: Institution;

  beforeEach(() => {
    institution = new Institution();
    institution.name = 'Test Institution';
    institution.billingEmail = 'billing@test.com';
    institution.isActive = true;
  });

  describe('Activation', () => {
    it('should deactivate the institution', () => {
      institution.deactivate();
      expect(institution.isActive).toBe(false);
    });

    it('should activate the institution', () => {
      institution.isActive = false;
      institution.activate();
      expect(institution.isActive).toBe(true);
    });
  });

  describe('updateBillingEmail', () => {
    it('should update the email if format is roughly valid', () => {
      institution.updateBillingEmail('new@test.com');
      expect(institution.billingEmail).toBe('new@test.com');
    });

    it('should throw if email lacks @', () => {
      expect(() => {
        institution.updateBillingEmail('invalid-email');
      }).toThrow('Invalid email format for billing.');
    });
  });
});
