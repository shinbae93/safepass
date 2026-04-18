import { IsOptional, IsString } from 'class-validator';

export class UpdateVaultEntryDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
