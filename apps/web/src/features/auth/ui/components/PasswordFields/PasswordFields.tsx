import { Field, FieldDescription, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import { PASSWORD_MIN_LENGTH } from "../../../constants/auth.constants";

interface PasswordFieldsProps {
  label?: string;
  idPrefix: string;
}

export function PasswordFields({
  label = "New password",
  idPrefix,
}: PasswordFieldsProps) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-password`}>{label}</FieldLabel>
        <Input
          id={`${idPrefix}-password`}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
        />
        <FieldDescription>
          At least {PASSWORD_MIN_LENGTH} characters.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-confirmation`}>
          Repeat the password
        </FieldLabel>
        <Input
          id={`${idPrefix}-confirmation`}
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
        />
      </Field>
    </>
  );
}
