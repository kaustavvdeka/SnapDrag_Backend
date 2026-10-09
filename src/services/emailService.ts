import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, RESEND_API_KEY } from '../config/constants.js';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: any = null;
  private isConfigured: boolean = false;

  constructor() {
    if (SMTP_USER && SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
      this.isConfigured = true;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.log(`[EmailService Mock] To: ${options.to} | Subject: ${options.subject}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: `Vastrix Traditional Clothing <${EMAIL_FROM || SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      return false;
    }
  }

  async sendReservationConfirmationEmail(to: string, reservationCode: string, productName: string, shopName: string, floorName?: string, shopNumber?: string): Promise<boolean> {
    const subject = `In-Store Hold Confirmed: ${reservationCode} - ${productName}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid #121212; padding: 24px; background-color: #FAF7EE;">
        <h1 style="text-transform: uppercase; font-size: 24px; color: #121212; margin-top: 0;">Vastrix Hold Confirmed</h1>
        <p style="font-size: 16px; color: #121212;">Your in-store hold for <strong>${productName}</strong> has been secured for 48 hours.</p>
        
        <div style="background-color: #FFE600; border: 2px solid #121212; padding: 16px; margin: 20px 0; text-align: center;">
          <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; display: block;">Show this reservation code at the counter</span>
          <span style="font-size: 28px; font-weight: 900; font-family: monospace; letter-spacing: 2px;">${reservationCode}</span>
        </div>

        <div style="border-top: 2px solid #121212; padding-top: 16px; font-size: 14px;">
          <p><strong>Shop:</strong> ${shopName}</p>
          ${floorName ? `<p><strong>Floor:</strong> ${floorName}</p>` : ''}
          ${shopNumber ? `<p><strong>Shop Number:</strong> ${shopNumber}</p>` : ''}
        </div>
        
        <p style="font-size: 12px; color: #666; margin-top: 24px;">No online payment was required. Visit the shop in person to inspect the weave and purchase offline.</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text: `Your in-store hold for ${productName} is confirmed! Reservation Code: ${reservationCode}. Visit ${shopName} within 48 hours.`,
    });
  }
}

export const emailService = new EmailService();
export default emailService;
