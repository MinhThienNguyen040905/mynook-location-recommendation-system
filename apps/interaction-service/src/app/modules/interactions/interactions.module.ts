import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserInteraction } from '@mynook/database';
import { InteractionsController } from './interactions.controller.js';
import { InteractionsService } from './interactions.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserInteraction])],
  controllers: [InteractionsController],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}
