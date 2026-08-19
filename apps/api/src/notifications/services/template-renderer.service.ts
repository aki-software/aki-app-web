import { Injectable } from '@nestjs/common';
import * as pug from 'pug';
import * as path from 'path';
import { colors } from '@akit/design-tokens';

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
    const templatePath = path.resolve(
      __dirname,
      '../templates',
      templateFileName,
    );

    return pug.renderFile(templatePath, {
      colors,
      logoDataUri: '',
      brandDomain: this.brandDomain,
      supportEmail: this.supportEmail,
      ...payload,
    });
  }

  getBrandDomain(): string {
    return this.brandDomain;
  }

  getSupportEmail(): string {
    return this.supportEmail;
  }
}
