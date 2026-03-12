import { Module } from '@nestjs/common';
import { DatabaseModule, Venue, MenuCategory, MenuItem } from '@mynook/database';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DatabaseModule.forRoot({ entities: [Venue, MenuCategory, MenuItem] }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
