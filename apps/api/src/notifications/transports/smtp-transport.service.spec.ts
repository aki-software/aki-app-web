import * as nodemailer from 'nodemailer';
import { SmtpTransportService } from './smtp-transport.service';

const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

describe('SmtpTransportService', () => {
  const createTransport = jest.mocked(nodemailer.createTransport);

  beforeEach(() => {
    createTransport.mockClear();
    mockSendMail.mockReset();
  });

  it('omits SMTP auth when local credentials are blank', () => {
    new SmtpTransportService('mailpit', 1025, '', '');

    expect(createTransport).toHaveBeenCalledWith({
      host: 'mailpit',
      port: 1025,
      secure: false,
    });
  });

  it('uses SMTP auth when both credentials are configured', () => {
    new SmtpTransportService('smtp.example.com', 465, 'user', 'pass');

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: { user: 'user', pass: 'pass' },
    });
  });

  it.each([
    ['user', ''],
    ['', 'pass'],
  ])('rejects partial SMTP authentication configuration', (user, pass) => {
    expect(
      () => new SmtpTransportService('smtp.example.com', 587, user, pass),
    ).toThrow('SMTP authentication requires both SMTP_USER and SMTP_PASS');
  });

  it('forwards email dispatch options to Nodemailer', async () => {
    mockSendMail.mockResolvedValue(undefined);
    const service = new SmtpTransportService('mailpit', 1025, '', '');
    const options = {
      from: 'from@example.com',
      to: 'to@example.com',
      subject: 'Subject',
      html: '<p>Body</p>',
      text: 'Body',
    };

    await expect(service.dispatchEmail(options)).resolves.toBeUndefined();
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining(options));
  });

  it('propagates Nodemailer send failures', async () => {
    const error = new Error('SMTP unavailable');
    mockSendMail.mockRejectedValue(error);
    const service = new SmtpTransportService('mailpit', 1025, '', '');

    await expect(
      service.dispatchEmail({
        from: 'from@example.com',
        to: 'to@example.com',
        subject: 'Subject',
        html: '<p>Body</p>',
      }),
    ).rejects.toBe(error);
  });
});
