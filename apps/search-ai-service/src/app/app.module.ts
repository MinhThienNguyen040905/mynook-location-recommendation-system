import { Module } from '@nestjs/common';
import { DatabaseModule, Tag, VenueTag, SearchLog } from '@mynook/database';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DatabaseModule.forRoot({ entities: [Tag, VenueTag, SearchLog] }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
