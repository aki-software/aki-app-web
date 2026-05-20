import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateOperationalAccountDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
