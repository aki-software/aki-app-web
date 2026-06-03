import { Test, TestingModule } from '@nestjs/testing';
import { AccountActivationNotifierService } from './account-activation-notifier.service.js';
import { MailService } from '../../mail/mail.service.js';
import { QUEUE_ADAPTER } from '../constants/adapters.constants.js';
import { JobNames } from '../jobs/index.js';
import { ACCOUNT_ACTIVATION_EMAIL_OPTIONS } from '../constants/notifications.constants.js';

describe('AccountActivationNotifierService', () => {
  let service: AccountActivationNotifierService;
  let mailService: MailService;
  let queueAdapter: any;

  beforeEach(async () => {
    queueAdapter = {
      isConfigured: jest.fn(),
      enqueue: jest.fn(),
    };
    mailService = {
      send: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountActivationNotifierService,
        { provide: MailService, useValue: mailService },
        { provide: QUEUE_ADAPTER, useValue: queueAdapter },
      ],
    }).compile();

    service = module.get<AccountActivationNotifierService>(
      AccountActivationNotifierService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyAccountActivation', () => {
    const email = 'test@example.com';
    const name = 'Test User';
    const activationLink = 'http://link.com';
    const institutionName = 'Test Inst';

    it('should send email directly if queue is not configured', async () => {
      queueAdapter.isConfigured.mockReturnValue(false);

      await service.notifyAccountActivation(
        email,
        name,
        activationLink,
        institutionName,
      );

      expect(mailService.send).toHaveBeenCalledWith(
        ACCOUNT_ACTIVATION_EMAIL_OPTIONS.template,
        expect.objectContaining({
          name,
          activationLink,
          institutionName,
        }),
        expect.objectContaining({
          to: email,
          subject: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.subject,
        }),
      );
      expect(queueAdapter.enqueue).not.toHaveBeenCalled();
    });

    it('should enqueue email if queue is configured', async () => {
      queueAdapter.isConfigured.mockReturnValue(true);

      await service.notifyAccountActivation(
        email,
        name,
        activationLink,
        institutionName,
      );

      expect(queueAdapter.enqueue).toHaveBeenCalledWith(
        JobNames.SendEmail,
        expect.objectContaining({
          template: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.template,
          payload: expect.objectContaining({
            name,
            activationLink,
            institutionName,
          }),
        }),
        expect.any(Object),
      );
      expect(mailService.send).not.toHaveBeenCalled();
    });

    it('should handle null institutionName', async () => {
      queueAdapter.isConfigured.mockReturnValue(false);

      await service.notifyAccountActivation(email, name, activationLink, null);

      expect(mailService.send).toHaveBeenCalledWith(
        ACCOUNT_ACTIVATION_EMAIL_OPTIONS.template,
        expect.objectContaining({
          name,
          activationLink,
          institutionName: null,
        }),
        expect.objectContaining({
          to: email,
        }),
      );
    });
  });
});
