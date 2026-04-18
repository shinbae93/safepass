import { IsNotEmpty, IsString } from 'class-validator';

export class UnlockDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  passwordHash: string;
}
