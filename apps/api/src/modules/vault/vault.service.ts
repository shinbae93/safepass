import { Injectable } from '@nestjs/common';
import { CreateVaultEntryDto } from './dto/create-vault-entry.dto';
import { UpdateVaultEntryDto } from './dto/update-vault-entry.dto';

@Injectable()
export class VaultService {
  findAll(_userId: string) {
    throw new Error('Not implemented');
  }

  create(_userId: string, _dto: CreateVaultEntryDto) {
    throw new Error('Not implemented');
  }

  update(_userId: string, _id: string, _dto: UpdateVaultEntryDto) {
    throw new Error('Not implemented');
  }

  remove(_userId: string, _id: string) {
    throw new Error('Not implemented');
  }
}
