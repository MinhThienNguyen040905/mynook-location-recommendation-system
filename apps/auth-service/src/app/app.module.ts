import { Module } from '@nestjs/common';
import { DatabaseModule, Account, RegistrationOtp } from '@mynook/database';
import { AuthServiceModule } from './modules/auth/auth.module.js';

@Module({
  imports: [
    DatabaseModule.forRoot({ entities: [Account, RegistrationOtp] }),
    AuthServiceModule,
  ],
})
export class AppModule {}
