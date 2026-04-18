import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VaultService } from './vault.service';
import { VaultRepository } from '../../database/repositories/vault.repository';

const mockVaultRepo = {
  findAllByUser: jest.fn(),
  findOneByUser: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deleteOne: jest.fn(),
};

describe('VaultService', () => {
  let service: VaultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultService,
        { provide: VaultRepository, useValue: mockVaultRepo },
      ],
    }).compile();
    service = module.get<VaultService>(VaultService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all entries for the user', async () => {
      const entries = [{ id: '1', userId: 'u1', title: 'Gmail' }];
      mockVaultRepo.findAllByUser.mockResolvedValue(entries);
      expect(await service.findAll('u1')).toEqual(entries);
      expect(mockVaultRepo.findAllByUser).toHaveBeenCalledWith('u1');
    });
  });

  describe('findOne', () => {
    it('returns entry when found', async () => {
      const entry = { id: '1', userId: 'u1', title: 'Gmail' };
      mockVaultRepo.findOneByUser.mockResolvedValue(entry);
      expect(await service.findOne('1', 'u1')).toEqual(entry);
    });

    it('throws NotFoundException when not found', async () => {
      mockVaultRepo.findOneByUser.mockResolvedValue(null);
      await expect(service.findOne('missing', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns a new entry', async () => {
      const entry = { id: '1', userId: 'u1', title: 'Gmail', value: 'secret', notes: null };
      mockVaultRepo.create.mockResolvedValue(entry);
      expect(await service.create('u1', { title: 'Gmail', value: 'secret' })).toEqual(entry);
      expect(mockVaultRepo.create).toHaveBeenCalledWith('u1', { title: 'Gmail', value: 'secret' });
    });
  });

  describe('update', () => {
    it('updates and returns the entry', async () => {
      const updated = { id: '1', userId: 'u1', title: 'Gmail Updated', value: 'secret', notes: null };
      mockVaultRepo.findOneByUser.mockResolvedValue({ id: '1' });
      mockVaultRepo.update.mockResolvedValue(updated);
      expect(await service.update('1', 'u1', { title: 'Gmail Updated' })).toEqual(updated);
    });

    it('throws NotFoundException when entry not found', async () => {
      mockVaultRepo.findOneByUser.mockResolvedValue(null);
      await expect(service.update('missing', 'u1', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the entry', async () => {
      mockVaultRepo.findOneByUser.mockResolvedValue({ id: '1' });
      mockVaultRepo.deleteOne.mockResolvedValue(undefined);
      await expect(service.remove('1', 'u1')).resolves.toBeUndefined();
      expect(mockVaultRepo.deleteOne).toHaveBeenCalledWith('1', 'u1');
    });

    it('throws NotFoundException when entry not found', async () => {
      mockVaultRepo.findOneByUser.mockResolvedValue(null);
      await expect(service.remove('missing', 'u1')).rejects.toThrow(NotFoundException);
    });
  });
});
