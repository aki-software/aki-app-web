import { Controller, Post, Body } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { UsersService } from '../users/users.service';

@Controller('sessions')
export class V1SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly usersService: UsersService,
  ) {}

  @Post('complete')
  async complete(@Body() payload: any) {
    // Intentamos buscar el nombre real del usuario
    let realName = 'Usuario App';
    if (payload.userId) {
      const user = await this.usersService.findOne(payload.userId);
      if (user) {
        realName = user.name;
      }
    }

    const adaptedDto = {
      patientId: payload.userId,
      patientName: realName,
      sessionDate: new Date(payload.startedAt || new Date()),
      hollandCode: payload.resultPayload?.hollandCode,
      totalTimeMs: this.calculateDuration(payload.startedAt, payload.finishedAt),
      results: (payload.resultPayload?.radar || []).map((r: any) => ({
        categoryId: r.categoryId,
        score: r.likes || r.score || 0,
        totalPossible: r.total || 0,
        percentage: r.affinity || 0,
      })),
      swipes: (payload.swipes || []).map((s: any) => ({
        cardId: s.cardId,
        categoryId: 'unknown',
        isLiked: s.liked,
        timestamp: new Date(s.timestamp || new Date()),
      })),
    };

    return this.sessionsService.create(adaptedDto as any);
  }

  private calculateDuration(start?: string, end?: string): number {
    if (!start || !end) return 0;
    try {
      return new Date(end).getTime() - new Date(start).getTime();
    } catch {
      return 0;
    }
  }
}
