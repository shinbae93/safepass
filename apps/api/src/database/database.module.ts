import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { VaultEntity } from './entities/vault.entity';
import { UserRepository } from './repositories/user.repository';
import { VaultRepository } from './repositories/vault.repository';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<DataSourceOptions>('database'),
    }),
    TypeOrmModule.forFeature([UserEntity, VaultEntity]),
  ],
  providers: [UserRepository, VaultRepository],
  exports: [UserRepository, VaultRepository],
})
export class DatabaseModule {}
