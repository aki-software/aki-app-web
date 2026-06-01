import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRegistrationService } from './user-registration.service.js';
import { UsersService } from './users.service.js';
import { Institution } from '../institutions/entities/institution.entity.js';
import { AccountActivationNotifierService } from '../common/notifications/account-activation-notifier.service.js';
import { CryptoService } from '../common/services/crypto.service.js';
import { UserRole } from './entities/user.entity.js';

describe('UserRegistrationService', () => {
  let service: UserRegistrationService;
  let usersService: any;
  let institutionRepository: any;
  let notifier: any;
  let cryptoService: any;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      register: jest.fn(),
      buildPasswordSetupLink: jest.fn(),
    };
    institutionRepository = {
      create: jest.fn(),
      save: jest.fn(),
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
        {
          provide: getRepositoryToken(Institution),
          useValue: institutionRepository,
        },
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

    it('should throw BadRequestException if email already exists', async () => {
      const existingUser = { id: '1', name: 'Old Name', email };
      usersService.findByEmail.mockResolvedValue(existingUser);

      await expect(service.register({ name, email, role })).rejects.toThrow(
        'El correo electrónico ya está registrado por otro usuario.',
      );
      expect(usersService.register).not.toHaveBeenCalled();
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
      institutionRepository.create.mockReturnValue({ id: 'inst-1' });
      institutionRepository.save.mockResolvedValue({ id: 'inst-1' });

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
      institutionRepository.create.mockReturnValue({
        id: 'inst-1',
        name: 'Consultorio John Doe',
      });
      institutionRepository.save.mockResolvedValue({
        id: 'inst-1',
        name: 'Consultorio John Doe',
      });

      await service.register({ name, email, role });

      expect(institutionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: `Consultorio ${name}`,
          responsibleTherapistUserId: '3',
        }),
      );
    });
  });
});
