import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SetupDto } from './dto/setup.dto';
import { UnlockDto } from './dto/unlock.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  getStatus() {
    return this.authService.getStatus();
  }

  @Get('salt')
  getSalt(@Query('username') username: string) {
    return this.authService.getSalt(username);
  }

  @Post('setup')
  setup(@Body() dto: SetupDto) {
    return this.authService.setup(dto);
  }

  @Post('unlock')
  unlock(@Body() dto: UnlockDto) {
    return this.authService.unlock(dto);
  }
}
