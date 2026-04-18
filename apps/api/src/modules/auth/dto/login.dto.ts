import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class LoginDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  passwordHash: string;
}
