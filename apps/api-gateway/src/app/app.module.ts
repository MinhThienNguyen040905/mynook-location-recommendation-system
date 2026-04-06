import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { VenueController } from './venue.controller.js';
import { NotificationController } from './notification.controller.js';
import { MenuController } from './menu.controller.js';
import { UploadController } from './upload.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    HttpModule,
    PassportModule,
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || 'mynook-dev-secret',
    }),
  ],
  controllers: [AuthController, VenueController, MenuController, NotificationController, UploadController],
  providers: [JwtStrategy],
})
export class AppModule {}
