import { Injectable } from '@nestjs/common';
import { SetupDto } from './dto/setup.dto';
import { UnlockDto } from './dto/unlock.dto';

@Injectable()
export class AuthService {
  getStatus(): { initialized: boolean } {
    throw new Error('Not implemented');
  }

  getSalt(): { salt: string } {
    throw new Error('Not implemented');
  }

  setup(dto: SetupDto): { token: string } {
    throw new Error('Not implemented');
  }

  unlock(dto: UnlockDto): { token: string } {
    throw new Error('Not implemented');
  }
}
