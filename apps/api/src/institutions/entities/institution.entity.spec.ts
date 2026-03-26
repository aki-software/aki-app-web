import { Institution } from './institution.entity';
import { User } from '../../users/entities/user.entity';

describe('Institution Entity', () => {
  it('should create an institution instance', () => {
    const institution = new Institution();
    institution.name = 'Test Institution';
    institution.adminUserId = 'user-uuid';
    
    expect(institution).toBeDefined();
    expect(institution.name).toBe('Test Institution');
    expect(institution.adminUserId).toBe('user-uuid');
  });

  it('should handle admin user relationship', () => {
    const institution = new Institution();
    const admin = new User();
    admin.id = 'user-uuid';
    admin.name = 'Admin User';
    
    institution.adminUser = admin;
    expect(institution.adminUser).toBeDefined();
    expect(institution.adminUser.name).toBe('Admin User');
  });
});
