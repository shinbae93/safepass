import { Injectable, NotFoundException } from '@nestjs/common';
import { VaultRepository } from '../../database/repositories/vault.repository';
import { CreateVaultEntryDto } from './dto/create-vault-entry.dto';
import { UpdateVaultEntryDto } from './dto/update-vault-entry.dto';
import { VaultEntity } from '../../database/entities/vault.entity';

@Injectable()
export class VaultService {
  constructor(private readonly vaultRepo: VaultRepository) {}

  findAll(userId: string): Promise<VaultEntity[]> {
    return this.vaultRepo.findAllByUser(userId);
  }

  async findOne(id: string, userId: string): Promise<VaultEntity> {
    const entry = await this.vaultRepo.findOneByUser(id, userId);
    if (!entry) throw new NotFoundException('Vault entry not found');
    return entry;
  }

  create(userId: string, dto: CreateVaultEntryDto): Promise<VaultEntity> {
    return this.vaultRepo.create(userId, dto);
  }

  async update(id: string, userId: string, dto: UpdateVaultEntryDto): Promise<VaultEntity> {
    await this.findOne(id, userId);
    return this.vaultRepo.update(id, userId, dto);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    return this.vaultRepo.deleteOne(id, userId);
  }
}
