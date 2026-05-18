import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserRegistrationService } from './user-registration.service.js';
import { UsersService } from './users.service.js';
import { InstitutionsService } from '../institutions/institutions.service.js';
import { AccountActivationNotifierService } from '../common/notifications/account-activation-notifier.service.js';
import { CryptoService } from '../common/services/crypto.service.js';
import { UserRole } from './entities/user.entity.js';

describe('UserRegistrationService', () => {
  let service: UserRegistrationService;
  let usersService: any;
  let institutionsService: any;
  let notifier: any;
  let cryptoService: any;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      register: jest.fn(),
      buildPasswordSetupLink: jest.fn(),
    };
    institutionsService = {
      create: jest.fn(),
      assignResponsibleTherapist: jest.fn(),
    };
    notifier = {
      notifyAccountActivation: jest.fn(),
    };
    cryptoService = {
      generateToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRegistrationService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: UsersService, useValue: usersService },
        { provide: InstitutionsService, useValue: institutionsService },
        { provide: AccountActivationNotifierService, useValue: notifier },
        { provide: CryptoService, useValue: cryptoService },
      ],
    }).compile();

    service = module.get<UserRegistrationService>(UserRegistrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const name = 'John Doe';
    const email = 'john@example.com';
    const role = UserRole.THERAPIST;

    it('should update existing user name if email exists', async () => {
      const existingUser = { id: '1', name: 'Old Name', email };
      usersService.findByEmail.mockResolvedValue(existingUser);
      usersService.register.mockResolvedValue({ ...existingUser, name });

      const result = await service.register({ name, email, role });

      expect(usersService.register).toHaveBeenCalledWith(
        expect.objectContaining({ name, email }),
      );
      expect(result.name).toBe(name);
    });

    it('should create a new user and trigger activation', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      cryptoService.generateToken.mockReturnValue('token123');
      const newUser = {
        id: '2',
        name,
        email,
        role,
        passwordSetupToken: 'token123',
      };
      usersService.register.mockResolvedValue(newUser);
      usersService.buildPasswordSetupLink.mockReturnValue('http://link.com');
      // Mock institution creation for therapist role
      institutionsService.create.mockResolvedValue({ id: 'inst-1' });

      const result = await service.register({ name, email, role });

      expect(usersService.register).toHaveBeenCalled();
      expect(notifier.notifyAccountActivation).toHaveBeenCalledWith(
        email,
        name,
        'http://link.com',
        null,
      );
      expect(result.id).toBe('2');
    });

    it('should create a private institution for therapists without one', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const userWithoutInst = {
        id: '3',
        name,
        email,
        role: UserRole.THERAPIST,
        institutionId: null,
      };
      usersService.register.mockResolvedValue(userWithoutInst);
      institutionsService.create.mockResolvedValue({
        id: 'inst-1',
        name: 'Consultorio John Doe',
      });

      await service.register({ name, email, role });

      expect(institutionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: `Consultorio ${name}`,
          responsibleTherapistUserId: '3',
        }),
      );
      expect(
        institutionsService.assignResponsibleTherapist,
      ).not.toHaveBeenCalled(); // Handled by register update in design
    });
  });
});
