import {
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  IsArray,
  ValidateNested,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateSessionSwipeDto {
  @IsString()
  cardId: string;

  @IsString()
  categoryId: string;

  @IsBoolean()
  isLiked: boolean;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  timestamp: Date;
}

export class CreateSessionResultDto {
  @IsString()
  categoryId: string;

  @IsNumber()
  score: number;

  @IsNumber()
  totalPossible: number;

  @IsNumber()
  percentage: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedCareers?: string[];

  @IsOptional()
  @IsString()
  materialSnippet?: string;
}

export class CreateSessionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsString()
  patientName: string;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  sessionDate: Date;

  @IsOptional()
  @IsString()
  hollandCode?: string;

  @IsOptional()
  @IsNumber()
  totalTimeMs?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSessionResultDto)
  results: CreateSessionResultDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSessionSwipeDto)
  swipes: CreateSessionSwipeDto[];
}
