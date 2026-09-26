export type PasswordPair =
  { ok: true; password: string } | { ok: false; message: string };

export const readPasswordPair = (form: FormData): PasswordPair => {
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("confirmation") ?? "");

  if (password !== confirmation) {
    return { ok: false, message: "The two passwords do not match." };
  }

  return { ok: true, password };
};
