import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRepository } from '../../database/repositories/user.repository';

const mockUserRepo = {
  countAll: jest.fn(),
  existsByUsername: jest.fn(),
  findByUsername: jest.fn(),
  save: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('returns initialized: false when no users exist', async () => {
      mockUserRepo.countAll.mockResolvedValue(0);
      expect(await service.getStatus()).toEqual({ initialized: false });
    });

    it('returns initialized: true when users exist', async () => {
      mockUserRepo.countAll.mockResolvedValue(1);
      expect(await service.getStatus()).toEqual({ initialized: true });
    });
  });

  describe('getSalt', () => {
    it('returns the salt for an existing user', async () => {
      mockUserRepo.findByUsername.mockResolvedValue({ username: 'alice', salt: 'abc123' });
      expect(await service.getSalt('alice')).toEqual({ salt: 'abc123' });
    });

    it('throws UnauthorizedException for unknown username', async () => {
      mockUserRepo.findByUsername.mockResolvedValue(null);
      await expect(service.getSalt('ghost')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('setup', () => {
    it('creates a user and returns a token', async () => {
      mockUserRepo.existsByUsername.mockResolvedValue(false);
      mockUserRepo.save.mockResolvedValue({ id: 'uuid-1', username: 'alice' });
      mockJwtService.sign.mockReturnValue('jwt-token');
      const result = await service.setup({ username: 'alice', salt: 'salt', passwordHash: 'hash' });
      expect(result).toEqual({ token: 'jwt-token' });
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'alice', salt: 'salt', passwordHash: 'hash' }),
      );
    });

    it('throws ConflictException when username is taken', async () => {
      mockUserRepo.existsByUsername.mockResolvedValue(true);
      await expect(
        service.setup({ username: 'alice', salt: 'salt', passwordHash: 'hash' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('unlock', () => {
    it('returns a token on correct passwordHash', async () => {
      const hash = Buffer.from('abc').toString('base64');
      mockUserRepo.findByUsername.mockResolvedValue({ id: 'uuid-1', username: 'alice', passwordHash: hash });
      mockJwtService.sign.mockReturnValue('jwt-token');
      const result = await service.unlock({ username: 'alice', passwordHash: hash });
      expect(result).toEqual({ token: 'jwt-token' });
    });

    it('throws UnauthorizedException for unknown username', async () => {
      mockUserRepo.findByUsername.mockResolvedValue(null);
      await expect(service.unlock({ username: 'ghost', passwordHash: 'hash' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for wrong passwordHash', async () => {
      mockUserRepo.findByUsername.mockResolvedValue({
        id: 'uuid-1',
        username: 'alice',
        passwordHash: Buffer.from('correct').toString('base64'),
      });
      await expect(service.unlock({ username: 'alice', passwordHash: Buffer.from('wrong').toString('base64') })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
