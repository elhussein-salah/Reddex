import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const port = config.get<number>('MAIL_PORT', 587);
        return {
          transport: {
            host: config.get('MAIL_HOST', 'smtp-relay.brevo.com'),
            port,
            secure: port === 465, // TLS on port 465, STARTTLS on 587
            auth: {
              user: config.get('MAIL_USER'),
              pass: config.get('MAIL_PASS'),
            },
          },
          defaults: {
            from: config.get('MAIL_FROM', '"Your App" <no-reply@yourapp.com>'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
