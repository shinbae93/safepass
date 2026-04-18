import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetupDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  salt: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  passwordHash: string;
}
