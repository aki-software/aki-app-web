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

    // Si se provee un nombre de clave (ej: 'clientId'), buscamos su valor real en el query o en los params de la request
    const resolvedClientId = clientId && typeof clientId === 'string'
      ? (request.query?.[clientId] || request.params?.[clientId])
      : undefined;

    return {
      role: user.role,
      ownerUserId: user.userId,
      ownerInstitutionId: isAdmin ? resolvedClientId : user.institutionId,
    };
  },
);
