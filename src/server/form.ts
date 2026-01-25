export const getFormString = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export const getFormNumber = (
  formData: FormData,
  key: string,
): number | null => {
  const value = getFormString(formData, key);
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};
