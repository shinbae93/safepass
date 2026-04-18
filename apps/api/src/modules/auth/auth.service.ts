import { Injectable } from '@nestjs/common';
import { SetupDto } from './dto/setup.dto';
import { UnlockDto } from './dto/unlock.dto';

@Injectable()
export class AuthService {
  getStatus(): { initialized: boolean } {
    throw new Error('Not implemented');
  }

  getSalt(_username: string): { salt: string } {
    throw new Error('Not implemented');
  }

  setup(_dto: SetupDto): { token: string } {
    throw new Error('Not implemented');
  }

  unlock(_dto: UnlockDto): { token: string } {
    throw new Error('Not implemented');
  }
}
