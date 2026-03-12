import { Module } from '@nestjs/common';
import { DatabaseModule, User } from '@mynook/database';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [DatabaseModule.forRoot({ entities: [User] })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
