export type MailPayload = Record<string, unknown>;

export type MailMeta = {
  to: string;
  subject: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
};

export interface MailAdapter {
  send(
    template: string,
    payload: MailPayload,
    meta: MailMeta,
  ): Promise<boolean>;
}
