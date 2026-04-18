import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';

@Module({
  imports: [DatabaseModule],
  controllers: [VaultController],
  providers: [VaultService],
})
export class VaultModule {}
