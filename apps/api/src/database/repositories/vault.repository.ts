import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VaultEntity } from '../entities/vault.entity';

@Injectable()
export class VaultRepository {
  constructor(
    @InjectRepository(VaultEntity)
    private readonly repo: Repository<VaultEntity>,
  ) {}
}
