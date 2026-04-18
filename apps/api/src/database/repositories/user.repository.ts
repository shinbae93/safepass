import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { username } });
  }

  existsByUsername(username: string): Promise<boolean> {
    return this.repo.exists({ where: { username } });
  }

  countAll(): Promise<number> {
    return this.repo.count();
  }

  save(entity: Partial<UserEntity>): Promise<UserEntity> {
    return this.repo.save(entity);
  }
}
