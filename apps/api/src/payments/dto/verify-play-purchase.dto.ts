import { IsNotEmpty, IsString, IsUUID, Length, Matches } from 'class-validator';

export class VerifyPlayPurchaseDto {
  @IsUUID()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 128)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
  productId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 2048)
  purchaseToken!: string;
}
