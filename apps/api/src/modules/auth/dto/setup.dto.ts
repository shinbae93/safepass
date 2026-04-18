import { IsNotEmpty, IsString } from 'class-validator';

export class SetupDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  salt: string;

  @IsString()
  @IsNotEmpty()
  passwordHash: string;
}
