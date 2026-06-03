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
  /**
   * Dispatches an email using the underlying strategy.
   * Throws an error if the dispatch fails, so that queues (e.g., BullMQ)
   * can handle retries appropriately.
   */
  dispatchEmail(options: DispatchEmailOptions): Promise<void>;
}
