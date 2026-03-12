import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type.js';

export interface DatabaseModuleOptions {
  entities: EntityClassOrSchema[];
}

@Module({})
export class DatabaseModule {
  /**
   * Register TypeORM with Supabase PostgreSQL connection.
   * Each microservice passes only its own entities.
   *
   * Usage:
   *   DatabaseModule.forRoot({ entities: [User] })
   */
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres' as const,
            url: config.get<string>('DATABASE_URL'),
            entities: options.entities,
            synchronize: false, // Dùng SQL migration trên Supabase, KHÔNG để TypeORM tự sync
            ssl: config.get('NODE_ENV') === 'production'
              ? { rejectUnauthorized: false }
              : false,
          }),
        }),
        TypeOrmModule.forFeature(options.entities),
      ],
      exports: [TypeOrmModule],
    };
  }
}
