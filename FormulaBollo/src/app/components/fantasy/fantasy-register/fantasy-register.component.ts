import { newPasswordValidator, passwordsMatchValidator } from '../../../../shared/validators/password.validators';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AccountApiService } from '../../../../shared/services/api/account-api.service';
import { Account } from '../../../../shared/models/account';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { SUCCESS_REGISTER } from '../../../constants';
import { FantasyAuthLayoutComponent } from '../fantasy-auth-layout/fantasy-auth-layout.component';
import { FantasyPasswordFieldComponent } from '../fantasy-password-field/fantasy-password-field.component';
import { FantasyPasswordRequirementsComponent } from '../fantasy-password-requirements/fantasy-password-requirements.component';

@Component({
  selector: 'app-fantasy-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputTextModule, ReactiveFormsModule, IconFieldModule, InputIconModule, RouterModule, FantasyAuthLayoutComponent, FantasyPasswordFieldComponent, FantasyPasswordRequirementsComponent],
  templateUrl: './fantasy-register.component.html',
  styleUrl: '../fantasy-auth-layout/fantasy-auth-form.scss'
})
export class FantasyRegisterComponent {
  private readonly accountApiService = inject(AccountApiService);
  private readonly router = inject(Router);
  private readonly messageInfoService = inject(MessageInfoService);
  private readonly destroyRef = inject(DestroyRef);
  readonly registerForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: Validators.required }),
    mail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, newPasswordValidator] }),
    passwordRepeated: new FormControl('', { nonNullable: true, validators: Validators.required })
  }, { validators: passwordsMatchValidator('password', 'passwordRepeated') });
  readonly formValue = toSignal(this.registerForm.valueChanges, { initialValue: this.registerForm.getRawValue() });
  readonly serverError = signal('');
  readonly registered = signal(false);
  readonly pending = signal(false);

  constructor() {
    this.registerForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.serverError.set(''));
  }

  passwordError(): string {
    const control = this.registerForm.controls.password;
    if (!control.invalid || !(control.dirty || control.touched)) return '';
    return control.hasError('passwordMin') ? 'La contraseña debe tener al menos 8 caracteres' : 'Necesitas poner una contraseña';
  }

  repeatedError(): string {
    const control = this.registerForm.controls.passwordRepeated;
    if (!(control.dirty || control.touched)) return '';
    return this.registerForm.hasError('passwordMismatch') ? 'La contraseña debe ser igual a la anterior' : control.invalid ? 'Necesitas poner la contraseña' : '';
  }

  register(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid || this.pending()) return;
    this.pending.set(true);
    const { username, password, mail } = this.registerForm.getRawValue();
    this.accountApiService.register(new Account(0, username, password, mail, 0)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: token => {
        this.pending.set(false);
        this.registered.set(true);
        localStorage.setItem('auth', token);
        this.messageInfoService.showSuccess(SUCCESS_REGISTER);
        this.router.navigate(['/fantasy']);
      },
      error: error => {
        this.pending.set(false);
        this.serverError.set(typeof error.error === 'string' ? error.error : 'No se pudo completar el registro.');
        this.messageInfoService.showError(error.error, error);
      }
    });
  }
}
