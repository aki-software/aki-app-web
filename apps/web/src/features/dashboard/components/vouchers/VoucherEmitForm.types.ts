export type VoucherFormState = {
  ownerInstitutionId: string;
  ownerUserId: string;
  quantity: string;
  expiresAt: string;
};

export const initialFormState: VoucherFormState = {
  ownerInstitutionId: "",
  ownerUserId: "",
  quantity: "1",
  expiresAt: "",
};
