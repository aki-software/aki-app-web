import { InternalServerErrorException, Logger } from '@nestjs/common';
import { EmailService } from './email.service.js';

describe('EmailService', () => {
  const mailTransport = { dispatchEmail: jest.fn() };
  const configService = { get: jest.fn().mockReturnValue('from@example.com') };
  const subject = () =>
    new EmailService(
      mailTransport,
      configService as unknown as ConstructorParameters<typeof EmailService>[1],
    );

  beforeEach(() => jest.resetAllMocks());

  it('sanitizes delivery logs and its public transport error', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const recipient = 'recipient@example.com';

    await expect(
      subject().sendEmail(recipient, 'Subject', '<p>body</p>'),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith('Email successfully sent');
    expect(log.mock.calls.flat().join(' ')).not.toContain(recipient);

    mailTransport.dispatchEmail.mockRejectedValueOnce(
      new Error('provider secret and stack details'),
    );
    await expect(
      subject().sendEmail(recipient, 'Subject', '<p>body</p>'),
    ).rejects.toEqual(new InternalServerErrorException('Email sending failed'));
    expect(error).toHaveBeenCalledWith('Email delivery failed');
    expect(error.mock.calls.flat().join(' ')).not.toContain(recipient);
    expect(error.mock.calls.flat().join(' ')).not.toContain('provider secret');
  });

  it('logs safe SMTP diagnostics without the provider message', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const transportError = Object.assign(new Error('provider secret'), {
      code: 'EAUTH',
      responseCode: 535,
    });
    mailTransport.dispatchEmail.mockRejectedValueOnce(transportError);

    await expect(
      subject().sendEmail('recipient@example.com', 'Subject', '<p>body</p>'),
    ).rejects.toEqual(new InternalServerErrorException('Email sending failed'));

    expect(error).toHaveBeenCalledWith(
      'Email delivery failed (code=EAUTH, responseCode=535)',
    );
    expect(error.mock.calls.flat().join(' ')).not.toContain('provider secret');
  });

  it('omits unrecognized provider-controlled error codes', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const transportError = Object.assign(new Error('provider secret'), {
      code: 'SMTP_PASSWORD=secret',
      responseCode: 535,
    });
    mailTransport.dispatchEmail.mockRejectedValueOnce(transportError);

    await expect(
      subject().sendEmail('recipient@example.com', 'Subject', '<p>body</p>'),
    ).rejects.toEqual(new InternalServerErrorException('Email sending failed'));

    expect(error).toHaveBeenCalledWith(
      'Email delivery failed (responseCode=535)',
    );
    expect(error.mock.calls.flat().join(' ')).not.toContain('SMTP_PASSWORD');
  });
});
