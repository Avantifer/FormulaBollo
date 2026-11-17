import { ValidatorFn } from '@angular/forms';

export const passwordPolicyValidator: ValidatorFn = control => {
  const value = control.value as string | null;
  if (!value?.trim()) return { required: true };
  return new TextEncoder().encode(value).length <= 72 ? null : { passwordBytes: true };
};

export function passwordsMatchValidator(first: string, repeated: string): ValidatorFn {
  return group => group.get(first)?.value === group.get(repeated)?.value
    ? null : { passwordMismatch: true };
}
