import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EmailService } from '../notifications/services/email.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);
  private readonly adminEmail: string;

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.adminEmail = this.configService.get<string>(
      'ADMIN_EMAIL',
      'contacto@orientaki.com',
    );
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a demo request or contact form' })
  @ApiResponse({
    status: 200,
    description: 'Request received and email sent successfully.',
  })
  async submitContactForm(@Body() createContactDto: CreateContactDto) {
    this.logger.log('Received contact form submission');

    const { name, email, institution, selected_plan } = createContactDto;
    const escapedName = escapeHtml(name);
    const escapedEmail = escapeHtml(email);
    const escapedInstitution = escapeHtml(institution);
    const escapedSelectedPlan = selected_plan
      ? escapeHtml(selected_plan)
      : undefined;
    const replyToHref = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      'Respuesta a tu solicitud de Orient A.KI',
    )}`;
    const subject = `NUEVA SOLICITUD DE DEMO - ${institution.replace(/[\r\n]+/g, ' ')}`;
    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <tr>
            <td style="background-color: #1e1b4b; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Orient A.KI</h1>
              <p style="color: #a5b4fc; margin: 10px 0 0 0; font-size: 16px;">Nueva Solicitud de Demo Institucional</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 24px;">
                ¡Hola! Alguien está interesado en llevar Orient A.KI a su institución. Aquí están los detalles del contacto:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; border-radius: 12px; padding: 24px;">
                <tr><td style="padding-bottom: 20px;"><p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.5px;">Nombre del Contacto</p><p style="margin: 4px 0 0 0; font-size: 16px; color: #111827; font-weight: 600;">${escapedName}</p></td></tr>
                <tr><td style="padding-bottom: 20px;"><p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.5px;">Correo Electrónico</p><p style="margin: 4px 0 0 0; font-size: 16px; color: #111827; font-weight: 600;"><a href="mailto:${encodeURIComponent(email)}" style="color: #4f46e5; text-decoration: none;">${escapedEmail}</a></p></td></tr>
                <tr><td ${escapedSelectedPlan ? 'style="padding-bottom: 20px;"' : ''}><p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.5px;">Institución u Organización</p><p style="margin: 4px 0 0 0; font-size: 16px; color: #111827; font-weight: 600;">${escapedInstitution}</p></td></tr>
                ${
                  escapedSelectedPlan
                    ? `<tr><td><p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.5px;">Plan de Interés</p><p style="margin: 8px 0 0 0; font-size: 16px; color: #111827; font-weight: 500;"><span style="background-color: #e0e7ff; color: #4338ca; padding: 6px 16px; border-radius: 9999px; font-size: 14px; font-weight: 700;">${escapedSelectedPlan}</span></p></td></tr>`
                    : ''
                }
              </table>
              <p style="margin: 32px 0 0 0; text-align: center;"><a href="${replyToHref}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Responder al Contacto</a></p>
            </td>
          </tr>
          <tr><td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;"><p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 20px;">Este correo fue enviado automáticamente desde el sitio web.<br>No es necesario que respondas a esta dirección automatizada.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.emailService.sendEmail(this.adminEmail, subject, html);
      return { success: true, message: 'Request received successfully.' };
    } catch (error) {
      this.logger.error(
        'Failed to dispatch contact form email',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Unable to submit contact request',
      );
    }
  }
}
