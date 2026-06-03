import { Injectable } from '@nestjs/common';
import * as pug from 'pug';
import * as path from 'path';
import { colors } from '@akit/design-tokens';

function getAppRoot(): string {
  const cwd = process.cwd().replace(/\\/g, '/');
  if (!cwd.endsWith('apps/api') && !cwd.includes('apps/api/')) {
    return path.join(process.cwd(), 'apps', 'api');
  }
  return process.cwd();
}

@Injectable()
export class TemplateRendererService {
  private readonly brandDomain = 'akituespacio.com.ar';
  private readonly supportEmail = 'akituvocacion@gmail.com';

  renderTemplate(
    templateName: string,
    payload: Record<string, unknown>,
  ): string {
    const templateFileName = templateName.endsWith('.pug')
      ? templateName
      : `${templateName}.pug`;
    const templatePath = path.join(
      getAppRoot(),
      'src',
      'mail',
      'templates',
      templateFileName,
    );

    return pug.renderFile(templatePath, {
      ...payload,
      colors,
      logoDataUri: this.getLogoDataUri(),
      brandDomain: this.brandDomain,
      supportEmail: this.supportEmail,
    });
  }

  private getLogoDataUri(): string {
    return `https://${this.brandDomain}/logo.png`;
  }

  getBrandDomain(): string {
    return this.brandDomain;
  }

  getSupportEmail(): string {
    return this.supportEmail;
  }
}
