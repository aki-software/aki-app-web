import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { InstitutionsController } from './institutions.controller.js';
import { InstitutionsService } from './institutions.service.js';
import { InstitutionAnalyticsService } from './services/institution-analytics.service.js';
import { InstitutionOperationalAccountService } from './services/institution-operational-account.service.js';
import { InstitutionPresenterService } from './services/institution-presenter.service.js';
import { InstitutionOwnerGuard } from './guards/institution-owner.guard.js';
import { UserRole } from '../users/entities/user.entity.js';

describe('InstitutionsController & InstitutionOwnerGuard', () => {
  let controller: InstitutionsController;
  let institutionsService: any;
  let analyticsService: any;
  let operationalService: any;
  let presenterService: any;
  let guard: InstitutionOwnerGuard;

  beforeEach(async () => {
    institutionsService = {
      findAll: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      softRemove: jest.fn(),
    };
    analyticsService = {
      getStats: jest.fn(),
      getOverview: jest.fn(),
    };
    operationalService = {
      createInstitutionWithOperationalAccount: jest.fn(),
      createOperationalAccount: jest.fn(),
    };
    presenterService = {
      toInstitutionListItemResponse: jest.fn(),
      toInstitutionResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionsController],
      providers: [
        { provide: InstitutionsService, useValue: institutionsService },
        { provide: InstitutionAnalyticsService, useValue: analyticsService },
        {
          provide: InstitutionOperationalAccountService,
          useValue: operationalService,
        },
        { provide: InstitutionPresenterService, useValue: presenterService },
        InstitutionOwnerGuard,
      ],
    }).compile();

    controller = module.get<InstitutionsController>(InstitutionsController);
    guard = module.get<InstitutionOwnerGuard>(InstitutionOwnerGuard);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(guard).toBeDefined();
  });

  describe('InstitutionOwnerGuard', () => {
    it('should return true if user is ADMIN', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: UserRole.ADMIN, institutionId: 'inst-1' },
            params: { id: 'inst-2' },
          }),
        }),
      } as any;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should return true if user belongs to the target institution', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: UserRole.INSTITUTION_ADMIN, institutionId: 'inst-1' },
            params: { id: 'inst-1' },
          }),
        }),
      } as any;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should throw ForbiddenException if user does not belong to the target institution', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: UserRole.INSTITUTION_ADMIN, institutionId: 'inst-1' },
            params: { id: 'inst-2' },
          }),
        }),
      } as any;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if no user is present', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: null,
            params: { id: 'inst-1' },
          }),
        }),
      } as any;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return paginated institutions list', async () => {
      institutionsService.findAll.mockResolvedValue([
        { id: '1', name: 'Inst 1' },
      ]);
      presenterService.toInstitutionListItemResponse.mockReturnValue({
        id: '1',
        name: 'Inst 1',
        responsibleTherapistActive: false,
      });

      const result = await controller.findAll();
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
    });
  });

  describe('create', () => {
    it('should create and return institution with activation info', async () => {
      const mockPayload = { name: 'Inst', billingEmail: 'test@test.com' };
      operationalService.createInstitutionWithOperationalAccount.mockResolvedValue(
        {
          institution: { id: '1', name: 'Inst' },
          activationEmailSent: true,
        },
      );
      presenterService.toInstitutionListItemResponse.mockReturnValue({
        id: '1',
        name: 'Inst',
      });

      const result = await controller.create(mockPayload);
      expect(result.activationEmailSent).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should call analytics service', async () => {
      analyticsService.getStats.mockResolvedValue({ totalVouchers: 10 });
      const result = await controller.getStats('inst-1');
      expect(analyticsService.getStats).toHaveBeenCalledWith('inst-1');
      expect(result).toEqual({ totalVouchers: 10 });
    });
  });

  describe('getOverview', () => {
    it('should call analytics service with default 7 days', async () => {
      analyticsService.getOverview.mockResolvedValue({ periodDays: 7 });
      const result = await controller.getOverview('inst-1');
      expect(analyticsService.getOverview).toHaveBeenCalledWith('inst-1', 7);
      expect(result).toEqual({ periodDays: 7 });
    });
  });

  describe('update', () => {
    it('should update and present institution', async () => {
      institutionsService.update.mockResolvedValue({ id: '1' });
      presenterService.toInstitutionResponse.mockReturnValue({
        id: '1',
        name: 'Updated',
      });

      const result = await controller.update('1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('updateStatus', () => {
    it('should toggle active state', async () => {
      institutionsService.updateStatus.mockResolvedValue({
        id: '1',
        isActive: false,
      });
      const result = await controller.updateStatus('1', { isActive: false });
      expect(result).toEqual({ id: '1', isActive: false });
    });
  });

  describe('remove', () => {
    it('should call softRemove', async () => {
      institutionsService.softRemove.mockResolvedValue(undefined);
      await controller.remove('1');
      expect(institutionsService.softRemove).toHaveBeenCalledWith('1');
    });
  });

  describe('createOperationalAccount', () => {
    it('should create operational user account', async () => {
      operationalService.createOperationalAccount.mockResolvedValue({
        institution: { id: '1' },
        activationEmailSent: true,
      });
      presenterService.toInstitutionListItemResponse.mockReturnValue({
        id: '1',
      });

      const result = await controller.createOperationalAccount('1', {
        email: 'ops@test.com',
      });
      expect(result.activationEmailSent).toBe(true);
    });
  });
});
