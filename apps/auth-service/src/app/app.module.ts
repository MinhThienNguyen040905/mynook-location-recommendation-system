import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule, Account, RegistrationOtp } from '@mynook/database';
import { RmqModule } from '@mynook/rmq-messaging';
import { RMQ_QUEUES } from '@mynook/shared-types';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    DatabaseModule.forRoot({ entities: [Account, RegistrationOtp] }),
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || 'mynook-dev-secret',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signOptions: { expiresIn: (process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m') as any },
    }),
    RmqModule.register({
      name: 'INTERACTION_SERVICE',
      queue: RMQ_QUEUES.INTERACTION,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AppModule {}
