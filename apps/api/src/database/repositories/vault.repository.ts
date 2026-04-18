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

  findAllByUser(userId: string): Promise<VaultEntity[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  findOneByUser(id: string, userId: string): Promise<VaultEntity | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async create(
    userId: string,
    data: { title: string; value: string; notes?: string },
  ): Promise<VaultEntity> {
    const entity = this.repo.create({ userId, ...data });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    userId: string,
    patch: { title?: string; value?: string; notes?: string | null },
  ): Promise<VaultEntity> {
    await this.repo.update({ id, userId }, patch);
    return this.repo.findOne({ where: { id, userId } });
  }

  async deleteOne(id: string, userId: string): Promise<void> {
    await this.repo.delete({ id, userId });
  }
}
