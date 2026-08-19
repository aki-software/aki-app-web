import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestReportDeliveryDto {
  @IsEmail()
  recipientEmail!: string;

  @IsString()
  @IsNotEmpty()
  operationKey!: string;
}
