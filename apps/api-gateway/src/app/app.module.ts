import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './common/strategies/jwt.strategy.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { VenueModule } from './modules/venue/venue.module.js';
import { InteractionModule } from './modules/interaction/interaction.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { TagModule } from './modules/tag/tag.module.js';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || 'mynook-dev-secret',
    }),
    AuthModule,
    VenueModule,
    InteractionModule,
    SearchModule,
    AdminModule,
    TagModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
