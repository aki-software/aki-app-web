import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity.js';
import { VoucherScope } from '@akit/contracts';

export const CurrentVoucherScope = createParamDecorator(
  (clientId: string | undefined, ctx: ExecutionContext): VoucherScope => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return {
        role: undefined,
        ownerUserId: undefined,
        ownerInstitutionId: undefined,
      };
    }

    const isAdmin = user.role?.toUpperCase() === UserRole.ADMIN;

    return {
      role: user.role,
      ownerUserId: user.userId,
      ownerInstitutionId: isAdmin ? clientId : user.institutionId,
    };
  },
);
