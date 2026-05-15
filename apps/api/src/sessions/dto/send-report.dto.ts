import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendReportDto {
  @IsEmail({}, { message: 'El formato del correo electrónico es inválido.' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido.' })
  email!: string;

  @IsOptional()
  @IsString({ message: 'El voucherId debe ser un texto válido.' })
  voucherId?: string;
}
