import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateContactDto {
  @ApiProperty({ description: 'Full name of the contact' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ description: 'Email address of the contact' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ description: 'Institution or Organization' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  institution: string;

  @ApiProperty({ description: 'Selected plan', required: false })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  selected_plan?: string;
}
