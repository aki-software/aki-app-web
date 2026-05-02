export const parseIntOrZero = (value: string | null | undefined): number => {
  const parsed = parseInt(value ?? '', 10);
  return isNaN(parsed) ? 0 : parsed;
};
