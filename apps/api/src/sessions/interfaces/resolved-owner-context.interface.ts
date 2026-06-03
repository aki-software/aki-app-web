import { User } from '../../users/entities/user.entity.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';

export interface ResolvedOwnerContext {
  user: User | null;
  voucher: Voucher | null;
  fallbackOwner: User | null;
  inferredPatientName: string;
  isTherapistUser: boolean;
  isPatientUser: boolean;
}
