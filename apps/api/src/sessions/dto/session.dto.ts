import { ApiProperty } from '@nestjs/swagger';
import {
  SessionData,
  SessionDetailData,
  SessionResultData,
  SessionSwipeData,
  SessionMetrics,
} from '@akit/contracts';

export class SessionResultDto implements SessionResultData {
  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  percentage!: number;
}

export class SessionSwipeDto implements SessionSwipeData {
  @ApiProperty()
  cardId!: string;

  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  isLiked!: boolean;

  @ApiProperty({ required: false, type: String })
  timestamp?: string | Date;
}

export class SessionDto implements SessionData {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  patientName!: string;

  @ApiProperty()
  hollandCode!: string;

  @ApiProperty({ type: String })
  sessionDate!: string | Date | number;

  @ApiProperty()
  totalTimeMs!: number;

  @ApiProperty()
  paymentStatus!: string;

  @ApiProperty({ required: false, nullable: true })
  institutionName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  therapistName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  voucherCode!: string | null;

  @ApiProperty({ required: false, type: String, nullable: true })
  reportUnlockedAt?: string | Date | null;

  @ApiProperty({ type: [SessionResultDto], required: false })
  results?: SessionResultDto[];
}

export class SessionDetailDto extends SessionDto implements SessionDetailData {
  @ApiProperty({ type: [SessionSwipeDto], required: false })
  swipes?: SessionSwipeDto[];

  @ApiProperty({ required: false, nullable: true })
  reportUrl?: string | null;

  @ApiProperty({ required: false })
  metrics?: SessionMetrics;
}
