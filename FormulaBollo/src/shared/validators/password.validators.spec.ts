import { FormControl } from '@angular/forms';
import { newPasswordValidator, passwordPolicyValidator } from './password.validators';

describe('Password validators', () => {
  it('requires at least eight characters for new passwords', () => {
    expect(newPasswordValidator(new FormControl('1234567'))).toEqual({ passwordMin: true });
    expect(newPasswordValidator(new FormControl('12345678'))).toBeNull();
  });

  it('accepts long passwords', () => {
    expect(newPasswordValidator(new FormControl('é'.repeat(100)))).toBeNull();
    expect(passwordPolicyValidator(new FormControl('é'.repeat(100)))).toBeNull();
  });

  it('rejects blank new passwords', () => {
    for (const value of [null, '', '        ']) {
      expect(newPasswordValidator(new FormControl(value))).toEqual({ required: true });
    }
  });

  it('counts Unicode characters rather than UTF-16 code units', () => {
    expect(newPasswordValidator(new FormControl('😀'.repeat(4)))).toEqual({ passwordMin: true });
    expect(newPasswordValidator(new FormControl('😀'.repeat(8)))).toBeNull();
  });

  it('keeps short legacy passwords valid under the login policy', () => {
    expect(passwordPolicyValidator(new FormControl('abc'))).toBeNull();
  });
});
