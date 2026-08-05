export const MAIL_TRANSPORT_TOKEN = Symbol('MAIL_TRANSPORT_TOKEN');

export interface DispatchEmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export interface MailTransport {
  dispatchEmail(options: DispatchEmailOptions): Promise<void>;
}
