import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envio de e-mail via SMTP (spec #16). Se o SMTP não estiver configurado
 * (desenvolvimento), registra o conteúdo no log em vez de falhar.
 * Nunca lança: falha de e-mail não deve interromper fluxos de negócio.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.configured = Boolean(this.configService.get<string>('SMTP_HOST'));
  }

  async sendMail(input: SendMailInput): Promise<void> {
    if (!this.configured) {
      this.logger.log(
        `SMTP não configurado; e-mail não enviado. to=${input.to} subject="${input.subject}"`,
      );
      return;
    }

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: this.configService.get<string>('SMTP_USER') ?? 'no-reply@ehorta.local',
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      this.logger.log(`E-mail enviado para ${input.to}: "${input.subject}"`);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail para ${input.to}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const port = this.configService.get<number>('SMTP_PORT') ?? 587;
      const user = this.configService.get<string>('SMTP_USER');
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port,
        secure: port === 465,
        auth: user
          ? { user, pass: this.configService.get<string>('SMTP_PASSWORD') }
          : undefined,
      });
    }
    return this.transporter;
  }
}
