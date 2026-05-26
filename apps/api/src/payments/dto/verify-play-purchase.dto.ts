import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPlayPurchaseDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  purchaseToken!: string;
}
