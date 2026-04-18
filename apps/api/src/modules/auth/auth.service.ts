import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UserRepository } from '../../database/repositories/user.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async getSalt(userId: string): Promise<{ salt: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new UnauthorizedException('Unknown user');
    return { salt: user.salt };
  }

  async register(dto: RegisterDto): Promise<{ token: string; userId: string }> {
    const exists = await this.userRepo.existsByUsername(dto.username);
    if (exists) throw new ConflictException('Username already taken');
    const user = await this.userRepo.save({
      username: dto.username,
      salt: dto.salt,
      passwordHash: dto.passwordHash,
    });
    const token = this.jwtService.sign({ sub: user.id });
    return { token, userId: user.id };
  }

  async login(dto: LoginDto): Promise<{ token: string }> {
    const user = await this.userRepo.findById(dto.userId);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const storedHash = Buffer.from(user.passwordHash, 'base64');
    const incomingHash = Buffer.from(dto.passwordHash, 'base64');

    if (
      storedHash.length !== incomingHash.length ||
      !crypto.timingSafeEqual(storedHash, incomingHash)
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id });
    return { token };
  }
}
