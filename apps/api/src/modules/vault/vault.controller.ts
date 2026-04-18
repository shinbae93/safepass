import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VaultService } from './vault.service';
import { CreateVaultEntryDto } from './dto/create-vault-entry.dto';
import { UpdateVaultEntryDto } from './dto/update-vault-entry.dto';

@Controller('vault')
@UseGuards(JwtAuthGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  findAll(@CurrentUser() user: { userId: string }) {
    return this.vaultService.findAll(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.vaultService.findOne(id, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateVaultEntryDto, @CurrentUser() user: { userId: string }) {
    return this.vaultService.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVaultEntryDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.vaultService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.vaultService.remove(id, user.userId);
  }
}
