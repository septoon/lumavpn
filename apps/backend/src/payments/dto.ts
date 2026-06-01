import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  userId!: string;

  @IsString()
  planCode!: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
