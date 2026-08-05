import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRegistrationService } from './user-registration.service.js';
import { UsersService } from './users.service.js';
import { Institution } from '../institutions/entities/institution.entity.js';
import { CryptoService } from '../common/services/crypto.service.js';
import { UserRole } from './entities/user.entity.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('UserRegistrationService', () => {
  let service: UserRegistrationService;
  let usersService: any;
  let institutionRepository: any;
  let cryptoService: any;
  let eventEmitter: any;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      register: jest.fn(),
      buildPasswordSetupLink: jest.fn(),
      findOne: jest.fn(),
    };
    institutionRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    cryptoService = {
      generateToken: jest.fn(),
    };
    eventEmitter = {
      emitAsync: jest.fn(),
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
        { provide: CryptoService, useValue: cryptoService },
        { provide: EventEmitter2, useValue: eventEmitter },
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

    it('should throw BadRequestException if email already exists and role is not PATIENT', async () => {
      const existingUser = {
        id: '1',
        name: 'Old Name',
        email,
        role: UserRole.THERAPIST,
      };
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
      usersService.findOne.mockResolvedValue(newUser);
      usersService.buildPasswordSetupLink.mockReturnValue('http://link.com');
      // Mock institution creation for therapist role
      institutionRepository.create.mockReturnValue({ id: 'inst-1' });
      institutionRepository.save.mockResolvedValue({ id: 'inst-1' });

      const result = await service.register({ name, email, role });

      expect(usersService.register).toHaveBeenCalled();
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        'account.activation.requested',
        expect.objectContaining({ email, name }),
      );
      expect(result.id).toBe('2');
    });

    it('should emit user.registered event for therapists without institution', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const userWithoutInst = {
        id: '3',
        name,
        email,
        role: UserRole.THERAPIST,
        institutionId: null,
      };
      usersService.register.mockResolvedValue(userWithoutInst);
      usersService.findOne.mockResolvedValue({
        ...userWithoutInst,
        institutionId: 'inst-1',
      });

      await service.register({ name, email, role });

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        'user.registered',
        userWithoutInst,
      );
    });
  });
});
