import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CompleteSessionDto as ICompleteSessionDto,
  SessionSwipeData,
} from '@akit/contracts';

class CompleteSessionSwipeDto implements SessionSwipeData {
  @ApiProperty()
  @IsString()
  cardId!: string;

  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty()
  @IsBoolean()
  isLiked!: boolean;

  @ApiProperty({ type: String })
  @IsISO8601()
  timestamp!: string;
}

class CompleteSessionCategoryResultDto {
  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty()
  @IsNumber()
  percentage!: number;

  @ApiProperty()
  @IsNumber()
  score!: number;

  @ApiProperty()
  @IsNumber()
  totalPossible!: number;

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

export class CompleteSessionDto implements ICompleteSessionDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catalogVersion?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsISO8601()
  finishedAt?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ type: [CompleteSessionCategoryResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteSessionCategoryResultDto)
  results!: CompleteSessionCategoryResultDto[];

  @ApiProperty({ type: [CompleteSessionSwipeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteSessionSwipeDto)
  swipes!: CompleteSessionSwipeDto[];

  @ApiProperty()
  @IsNumber()
  totalTimeMs!: number;
}
