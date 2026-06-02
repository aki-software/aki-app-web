import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InstitutionsService } from './institutions.service.js';
import { Institution } from './entities/institution.entity.js';

describe('InstitutionsService', () => {
  let service: InstitutionsService;
  let repository: any;

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionsService,
        {
          provide: getRepositoryToken(Institution),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<InstitutionsService>(InstitutionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of institutions ordered by name', async () => {
      const mockResult = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ];
      repository.find.mockResolvedValue(mockResult);

      const result = await service.findAll();
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['responsibleTherapist'],
        order: { name: 'ASC' },
      });
      expect(result).toBe(mockResult);
    });
  });

  describe('findOneOrFail', () => {
    it('should return a single institution or throw error', async () => {
      const mockResult = { id: '123', name: 'Test' };
      repository.findOneOrFail.mockResolvedValue(mockResult);

      const result = await service.findOneOrFail('123');
      expect(repository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: '123' },
        relations: ['responsibleTherapist'],
      });
      expect(result).toBe(mockResult);
    });
  });

  describe('create', () => {
    it('should create and save an institution', async () => {
      const inputDto = {
        name: ' New Inst ',
        billingEmail: 'billing@test.com ',
      };
      const mockInst = {
        name: 'New Inst',
        billingEmail: 'billing@test.com',
        isActive: true,
      };
      repository.create.mockReturnValue(mockInst);
      repository.save.mockResolvedValue(mockInst);

      const result = await service.create(inputDto);
      expect(repository.create).toHaveBeenCalledWith({
        name: 'New Inst',
        billingEmail: 'billing@test.com',
        responsibleTherapistUserId: null,
        isActive: true,
      });
      expect(repository.save).toHaveBeenCalledWith(mockInst);
      expect(result).toBe(mockInst);
    });
  });

  describe('assignResponsibleTherapist', () => {
    it('should update therapist ID and return updated institution', async () => {
      const mockInst = {
        id: '1',
        name: 'Inst',
        responsibleTherapistUserId: 'therapist-1',
      };
      repository.update.mockResolvedValue({});
      repository.findOneOrFail.mockResolvedValue(mockInst);

      const result = await service.assignResponsibleTherapist(
        '1',
        'therapist-1',
      );
      expect(repository.update).toHaveBeenCalledWith('1', {
        responsibleTherapistUserId: 'therapist-1',
      });
      expect(repository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['responsibleTherapist'],
      });
      expect(result).toBe(mockInst);
    });
  });

  describe('update', () => {
    it('should update and return the updated institution', async () => {
      const mockInst = { id: '1', name: 'Updated name' };
      repository.update.mockResolvedValue({});
      repository.findOneOrFail.mockResolvedValue(mockInst);

      const result = await service.update('1', {
        name: ' Updated name ',
        billingEmail: '',
      });
      expect(repository.update).toHaveBeenCalledWith('1', {
        name: 'Updated name',
        billingEmail: null,
      });
      expect(result).toBe(mockInst);
    });
  });

  describe('updateStatus', () => {
    it('should update isActive status and return institution', async () => {
      const mockInst = { id: '1', isActive: false };
      repository.update.mockResolvedValue({});
      repository.findOneOrFail.mockResolvedValue(mockInst);

      const result = await service.updateStatus('1', false);
      expect(repository.update).toHaveBeenCalledWith('1', { isActive: false });
      expect(result).toBe(mockInst);
    });
  });

  describe('softRemove', () => {
    it('should find and soft remove the institution', async () => {
      const mockInst = { id: '1' };
      repository.findOneOrFail.mockResolvedValue(mockInst);
      repository.softRemove.mockResolvedValue({});

      await service.softRemove('1');
      expect(repository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(repository.softRemove).toHaveBeenCalledWith(mockInst);
    });
  });
});
