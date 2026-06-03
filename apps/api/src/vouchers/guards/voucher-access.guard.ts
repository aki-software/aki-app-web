import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.types.js';
import { UserRole } from '../../users/entities/user.entity.js';
import { VoucherScope } from '@akit/contracts';
import { VouchersService } from '../vouchers.service.js';
import { Voucher } from '../entities/voucher.entity.js';

const FORBIDDEN_MESSAGE = 'No tienes permisos para acceder a este voucher';

@Injectable()
export class VoucherAccessGuard implements CanActivate {
  constructor(private readonly vouchersService: VouchersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { voucher?: Voucher }>();
    const code = String(request.params?.code ?? '');

    if (!code) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE);
    }

    const scope: VoucherScope = {
      role: request.user?.role,
      ownerUserId: request.user?.userId,
      ownerInstitutionId:
        request.user?.role?.toUpperCase() === UserRole.ADMIN
          ? undefined
          : request.user?.institutionId,
    };

    const voucher = await this.vouchersService.findByCode(code, scope);
    request.voucher = voucher;
    return true;
  }
}
