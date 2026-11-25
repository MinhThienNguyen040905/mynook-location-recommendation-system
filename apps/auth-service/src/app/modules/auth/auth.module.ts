import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, RegistrationOtp } from '@mynook/database';
import { RmqModule } from '@mynook/rmq-messaging';
import { getJwtSecrets } from '@mynook/shared-types';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

const jwt = getJwtSecrets();

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, RegistrationOtp]),
    JwtModule.register({
      secret: jwt.accessSecret,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signOptions: { expiresIn: jwt.accessExpiresIn as any },
    }),
    RmqModule.registerPublisher({ name: 'EVENTS_SERVICE' }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthServiceModule {}
