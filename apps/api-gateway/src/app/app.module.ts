import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [AuthController],
})
export class AppModule {}
