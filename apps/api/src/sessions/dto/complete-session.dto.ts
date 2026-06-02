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

class CompleteSessionSwipeDto {
  @IsString()
  cardId!: string;

  @IsString()
  categoryId!: string;

  @IsBoolean()
  liked!: boolean;

  @IsISO8601()
  timestamp!: string;
}

class CompleteSessionRadarItemDto {
  @IsString()
  categoryId!: string;

  @IsNumber()
  likes!: number;

  @IsNumber()
  total!: number;

  @IsNumber()
  affinity!: number;
}

class CompleteSessionCategoryResultDto {
  @IsString()
  categoryId!: string;

  @IsNumber()
  percentage!: number;

  @IsNumber()
  score!: number;

  @IsNumber()
  totalPossible!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedCareers?: string[];

  @IsOptional()
  @IsString()
  materialSnippet?: string;
}

class CompleteSessionResultPayloadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteSessionRadarItemDto)
  radar!: CompleteSessionRadarItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteSessionCategoryResultDto)
  top3!: CompleteSessionCategoryResultDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteSessionCategoryResultDto)
  bottom3!: CompleteSessionCategoryResultDto[];

  @IsString()
  hollandCode!: string;
}

export class CompleteSessionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  therapistUserId?: string;

  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @IsOptional()
  @IsUUID()
  voucherId?: string;

  @IsOptional()
  @IsString()
  voucherCode?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsString()
  patientName!: string;

  @IsString()
  catalogVersion!: string;

  @IsISO8601()
  startedAt!: string;

  @IsISO8601()
  finishedAt!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteSessionSwipeDto)
  swipes!: CompleteSessionSwipeDto[];

  @ValidateNested()
  @Type(() => CompleteSessionResultPayloadDto)
  resultPayload!: CompleteSessionResultPayloadDto;
}
