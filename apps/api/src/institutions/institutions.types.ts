export type InstitutionResponse = {
  id: string;
  name: string;
  billingEmail: string | null;
  isActive: boolean;
  createdAt: Date;
  responsibleTherapistUserId: string | null;
  responsibleTherapistName: string | null;
};

export type InstitutionListItemResponse = InstitutionResponse & {
  responsibleTherapistActive: boolean;
};

export type InstitutionsListResponse = {
  data: InstitutionListItemResponse[];
};

export type InstitutionStatusResponse = {
  id: string;
  isActive: boolean;
};

export type InstitutionOperationalAccountResponse =
  InstitutionListItemResponse & {
    activationEmailSent: boolean;
  };

export type InstitutionCreateResponse = InstitutionResponse & {
  activationEmailSent: boolean;
};
