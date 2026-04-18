import { Injectable } from '@nestjs/common';
import { CreateVaultEntryDto } from './dto/create-vault-entry.dto';
import { UpdateVaultEntryDto } from './dto/update-vault-entry.dto';

@Injectable()
export class VaultService {
  findAll(userId: string) {
    throw new Error('Not implemented');
  }

  create(userId: string, dto: CreateVaultEntryDto) {
    throw new Error('Not implemented');
  }

  update(userId: string, id: string, dto: UpdateVaultEntryDto) {
    throw new Error('Not implemented');
  }

  remove(userId: string, id: string) {
    throw new Error('Not implemented');
  }
}
