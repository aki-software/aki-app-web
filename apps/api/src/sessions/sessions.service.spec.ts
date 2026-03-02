import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';

describe('SessionsService', () => {
  let service: SessionsService;

  // Mock del repositorio de TypeORM
  const mockSessionRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((session) => Promise.resolve({ id: 'uuid-123', ...session })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepository,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully insert a session', async () => {
      const createSessionDto: CreateSessionDto = {
        patientName: 'Test Patient',
        results: [],
        swipes: [],
      };

      const result = await service.create(createSessionDto);

      expect(result).toEqual({
        id: 'uuid-123',
        patientName: 'Test Patient',
        results: [],
        swipes: [],
      });
      expect(mockSessionRepository.create).toHaveBeenCalledWith(createSessionDto);
      expect(mockSessionRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
