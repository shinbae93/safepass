import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVaultEntryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
