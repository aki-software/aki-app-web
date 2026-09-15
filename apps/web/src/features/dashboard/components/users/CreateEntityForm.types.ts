export type EntityFormState = {
  name: string;
  email: string;
  billingEmail: string;
  legalName: string;
  taxId: string;
  taxCondition: string;
  billingAddress: string;
};

export const initialFormState: EntityFormState = {
  name: "",
  email: "",
  billingEmail: "",
  legalName: "",
  taxId: "",
  taxCondition: "",
  billingAddress: "",
};
