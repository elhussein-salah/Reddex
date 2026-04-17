import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset OTP',
        text: `Your password reset OTP is ${otp}. It is valid for 10 minutes.`,
        html: `<p>Your password reset OTP is <b>${otp}</b>. It is valid for 10 minutes.</p>`,
      });
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP to ${email}`, error);
      throw new InternalServerErrorException('Failed to send email OTP');
    }
  }
}
