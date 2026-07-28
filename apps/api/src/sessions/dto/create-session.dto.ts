import {
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  IsArray,
  ValidateNested,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionPaymentStatus } from '../entities/session.entity.js';
import {
  CreateSessionDto as ICreateSessionDto,
  SessionResultData,
  SessionSwipeData,
} from '@akit/contracts';

export class CreateSessionSwipeDto implements SessionSwipeData {
  @ApiProperty()
  @IsString()
  cardId!: string;

  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty()
  @IsBoolean()
  isLiked!: boolean;

  @ApiProperty()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  timestamp!: Date;
}

export class CreateSessionResultDto implements SessionResultData {
  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty()
  @IsNumber()
  score!: number;

  @ApiProperty()
  @IsNumber()
  totalPossible!: number;

  @ApiProperty()
  @IsNumber()
  percentage!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  timeSpentMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weightedScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  avgResponseTimeMs?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedCareers?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  materialSnippet?: string;
}

export class CreateSessionDto implements ICreateSessionDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  therapistUserId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  voucherId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ enum: SessionPaymentStatus })
  @IsOptional()
  @IsEnum(SessionPaymentStatus)
  paymentStatus?: SessionPaymentStatus;

  @ApiProperty()
  @IsString()
  patientName!: string;

  @ApiProperty()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  sessionDate!: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hollandCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalTimeMs?: number;

  @ApiProperty({ type: [CreateSessionResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSessionResultDto)
  results!: CreateSessionResultDto[];

  @ApiProperty({ type: [CreateSessionSwipeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSessionSwipeDto)
  swipes!: CreateSessionSwipeDto[];
}
