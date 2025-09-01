import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { EmailSummary } from '../types';

export class GmailConnector {
  private transporter: nodemailer.Transporter;

  constructor(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
    private userEmail: string
  ) {
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    
    // Setup nodemailer with Gmail OAuth2
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: userEmail,
        clientId,
        clientSecret,
        refreshToken,
        accessToken: undefined, // Let it auto-refresh
      },
    } as any);
  }

  async sendWeeklySummary(to: string, summary: EmailSummary): Promise<void> {
    const mailOptions = {
      from: this.userEmail,
      to,
      subject: summary.subject,
      text: summary.textContent,
      html: summary.htmlContent,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendScheduleSummary(to: string, subject: string, htmlContent: string, textContent?: string): Promise<void> {
    const mailOptions = {
      from: this.userEmail,
      to,
      subject,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
      html: htmlContent,
    };

    await this.transporter.sendMail(mailOptions);
  }
}