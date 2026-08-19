import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import sanitizeHtml from 'sanitize-html';

const sanitizeText = (value: unknown): unknown =>
  typeof value === 'string'
    ? sanitizeHtml(value, { allowedTags: [] }).trim()
    : value;

const sanitizeTextArray = (value: unknown): unknown =>
  Array.isArray(value) ? value.map(sanitizeText) : value;

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => sanitizeText(value))
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => sanitizeText(value))
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Transform(({ value }) => sanitizeTextArray(value))
  occupations?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Transform(({ value }) => sanitizeTextArray(value))
  formalProfessions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Transform(({ value }) => sanitizeTextArray(value))
  competencies?: string[];
}
