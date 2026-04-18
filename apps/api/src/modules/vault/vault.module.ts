import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [VaultController],
  providers: [VaultService],
})
export class VaultModule {}
