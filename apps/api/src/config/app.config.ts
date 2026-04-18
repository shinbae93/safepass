import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
jwtSecret: process.env.JWT_SECRET ?? 'dev_jwt_secret_change_me',
}));
