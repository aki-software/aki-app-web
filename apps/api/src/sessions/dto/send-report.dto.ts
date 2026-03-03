import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendReportDto {
  @IsEmail({}, { message: 'El formato del correo electrónico es inválido.' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido.' })
  email: string;
}
