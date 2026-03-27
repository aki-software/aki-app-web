import { Institution } from './institution.entity';
import { User } from '../../users/entities/user.entity';

describe('Institution Entity', () => {
  it('should create an institution instance', () => {
    const institution = new Institution();
    institution.name = 'Test Institution';
    institution.billingEmail = 'billing@test.com';
    
    expect(institution).toBeDefined();
    expect(institution.name).toBe('Test Institution');
    expect(institution.billingEmail).toBe('billing@test.com');
  });

  it('should handle responsible therapist relationship', () => {
    const institution = new Institution();
    const therapist = new User();
    therapist.id = 'user-uuid';
    therapist.name = 'Responsible Therapist';
    
    institution.responsibleTherapist = therapist;
    expect(institution.responsibleTherapist).toBeDefined();
    expect(institution.responsibleTherapist?.name).toBe('Responsible Therapist');
  });
});
