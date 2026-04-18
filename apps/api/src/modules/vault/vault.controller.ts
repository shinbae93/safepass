import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { VaultService } from './vault.service';
import { CreateVaultEntryDto } from './dto/create-vault-entry.dto';
import { UpdateVaultEntryDto } from './dto/update-vault-entry.dto';

@Controller('vault')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  findAll() {
    // userId will come from JWT guard once auth is implemented
    return this.vaultService.findAll('placeholder-user-id');
  }

  @Post()
  create(@Body() dto: CreateVaultEntryDto) {
    return this.vaultService.create('placeholder-user-id', dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVaultEntryDto) {
    return this.vaultService.update('placeholder-user-id', id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vaultService.remove('placeholder-user-id', id);
  }
}
