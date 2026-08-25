import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ description: 'Full name of the contact' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Email address of the contact' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Institution or Organization' })
  @IsString()
  @IsNotEmpty()
  institution: string;

  @ApiProperty({ description: 'Selected plan', required: false })
  @IsString()
  @IsOptional()
  selected_plan?: string;
}

