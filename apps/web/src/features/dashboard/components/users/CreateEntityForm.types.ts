export type EntityFormState = {
  name: string;
  email: string;
  billingEmail: string;
};

export const initialFormState: EntityFormState = {
  name: "",
  email: "",
  billingEmail: "",
};
