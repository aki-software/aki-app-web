import { InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ContactController } from './contact.controller';
import { CreateContactDto } from './dto/create-contact.dto';

describe('ContactController', () => {
  const sendEmail = jest.fn();
  const controller = new ContactController(
    { sendEmail } as never,
    { get: jest.fn().mockReturnValue('admin@example.com') } as never,
  );

  beforeEach(() => {
    sendEmail.mockReset();
  });

  it('escapes user-controlled HTML and encodes the reply mailto URL', async () => {
    sendEmail.mockResolvedValue(undefined);

    await controller.submitContactForm({
      name: '<img src=x onerror=alert(1)>',
      email: 'person+tag@example.com',
      institution: 'School & Co.',
      selected_plan: 'Plan "<premium>"',
    });

    const [, subject, html] = sendEmail.mock.calls[0];
    expect(subject).toBe('NUEVA SOLICITUD DE DEMO - School & Co.');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('School &amp; Co.');
    expect(html).toContain('Plan &quot;&lt;premium&gt;&quot;');
    expect(html).toContain('mailto:person%2Btag%40example.com');
    expect(html).toContain(
      'subject=Respuesta%20a%20tu%20solicitud%20de%20Orient%20A.KI',
    );
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });

  it('returns success only after email dispatch succeeds', async () => {
    sendEmail.mockResolvedValue(undefined);

    await expect(
      controller.submitContactForm({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        institution: 'A.kit',
      }),
    ).resolves.toEqual({
      success: true,
      message: 'Request received successfully.',
    });
  });

  it('propagates email dispatch failures as a generic server error', async () => {
    sendEmail.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(
      controller.submitContactForm({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        institution: 'A.kit',
      }),
    ).rejects.toEqual(
      new InternalServerErrorException('Unable to submit contact request'),
    );
  });

  it('trims fields and rejects empty or overly long values', async () => {
    const dto = plainToInstance(CreateContactDto, {
      name: '  Ada Lovelace  ',
      email: '  ada@example.com  ',
      institution: '   ',
      selected_plan: 'x'.repeat(101),
    });

    expect(dto.name).toBe('Ada Lovelace');
    expect(dto.email).toBe('ada@example.com');
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['institution', 'selected_plan']),
    );
  });
});
