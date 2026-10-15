import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";
import { PrismaService } from "../prisma/prisma.service";
import type { MailContent } from "./mail.templates";

const MAX_ATTEMPTS = 6;

/**
 * Sends email through any SMTP server (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM).
 * Messages are written to the database first and sent by a small background loop, so a mail
 * outage delays messages instead of losing them. Without SMTP settings, development and tests
 * print or capture messages, and production simply reports that mail is off.
 */
@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  /** Messages "sent" while no SMTP server is configured and NODE_ENV is "test". */
  static captured: Array<{ to: string; subject: string; text: string }> = [];

  private readonly logger = new Logger("Mail");
  private transport?: Transporter;
  private timer?: NodeJS.Timeout;
  private running = false;

  /** A real SMTP server is configured. */
  readonly smtp = Boolean(process.env.SMTP_HOST);
  readonly from = process.env.MAIL_FROM ?? "Invitation-card.com <no-reply@localhost>";

  constructor(private readonly prisma: PrismaService) {}

  /** Account emails (verification, password reset) can be delivered, or are visible in the dev log. */
  get canSend(): boolean {
    return this.smtp || process.env.NODE_ENV !== "production";
  }

  /** Publishing needs a confirmed email. Only enforced when real mail can reach people. */
  get requireVerifiedEmail(): boolean {
    const flag = process.env.REQUIRE_VERIFIED_EMAIL;
    return flag === undefined || flag === "" ? this.smtp : flag === "1" || flag === "true";
  }

  onModuleInit() {
    if (!this.smtp) {
      if (process.env.NODE_ENV === "production") {
        this.logger.warn("SMTP_HOST is not set: password reset and email verification are switched off.");
      }
      return;
    }
    const port = Number(process.env.SMTP_PORT ?? 587);
    this.transport = createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Port 465 uses implicit TLS. Other ports start plain and upgrade with STARTTLS.
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
    });
    this.timer = setInterval(() => void this.processOutbox(), 5_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async send(to: string, content: MailContent): Promise<void> {
    if (!this.smtp) {
      if (process.env.NODE_ENV === "test") MailService.captured.push({ to, subject: content.subject, text: content.text });
      else if (process.env.NODE_ENV !== "production") {
        this.logger.log(`\n--- email to ${to} ---\n${content.subject}\n\n${content.text}\n---`);
      }
      return;
    }
    await this.prisma.emailOutbox.create({
      data: { toEmail: to, subject: content.subject, text: content.text, html: content.html },
    });
    setImmediate(() => void this.processOutbox());
  }

  /** Sends due messages, oldest first. Failed ones are retried with a growing delay. */
  async processOutbox(): Promise<void> {
    if (this.running || !this.transport) return;
    this.running = true;
    try {
      const due = await this.prisma.emailOutbox.findMany({
        where: { sentAt: null, attempts: { lt: MAX_ATTEMPTS }, runAfter: { lte: new Date() } },
        orderBy: { createdAt: "asc" },
        take: 10,
      });
      for (const mail of due) {
        try {
          await this.transport.sendMail({
            from: this.from,
            to: mail.toEmail,
            subject: mail.subject,
            text: mail.text,
            html: mail.html,
          });
          await this.prisma.emailOutbox.update({ where: { id: mail.id }, data: { sentAt: new Date(), lastError: null } });
        } catch (err) {
          const attempts = mail.attempts + 1;
          const delayMin = Math.min(2 ** attempts, 60);
          await this.prisma.emailOutbox.update({
            where: { id: mail.id },
            data: {
              attempts,
              lastError: String((err as Error).message ?? err).slice(0, 300),
              runAfter: new Date(Date.now() + delayMin * 60_000),
            },
          });
          this.logger.warn(`Sending to ${mail.toEmail} failed (attempt ${attempts}): ${(err as Error).message}`);
        }
      }
      // Sent messages are only kept for a week.
      await this.prisma.emailOutbox.deleteMany({ where: { sentAt: { lt: new Date(Date.now() - 7 * 86_400_000) } } });
    } catch (err) {
      this.logger.warn(`Outbox run failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
