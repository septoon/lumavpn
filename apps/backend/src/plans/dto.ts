import { VpnType } from '@prisma/client';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  priceRub!: number;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(VpnType, { each: true })
  vpnTypes!: VpnType[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePlanDto extends CreatePlanDto {}
