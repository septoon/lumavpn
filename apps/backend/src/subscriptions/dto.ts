import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ActivateSubscriptionDto {
  @IsString()
  userId!: string;

  @IsString()
  planCode!: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
