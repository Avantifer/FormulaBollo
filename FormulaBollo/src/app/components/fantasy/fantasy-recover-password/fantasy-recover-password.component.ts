import { newPasswordValidator, passwordsMatchValidator } from '../../../../shared/validators/password.validators';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, Injector, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AccountApiService } from '../../../../shared/services/api/account-api.service';
import { ERROR_CHANGE_PASSWORD } from '../../../constants';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { FantasyAuthLayoutComponent } from '../fantasy-auth-layout/fantasy-auth-layout.component';
import { FantasyPasswordFieldComponent } from '../fantasy-password-field/fantasy-password-field.component';
import { FantasyPasswordRequirementsComponent } from '../fantasy-password-requirements/fantasy-password-requirements.component';

@Component({
  selector: 'app-fantasy-recover-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterModule, FantasyAuthLayoutComponent, FantasyPasswordFieldComponent, FantasyPasswordRequirementsComponent],
  templateUrl: './fantasy-recover-password.component.html',
  styleUrl: '../fantasy-auth-layout/fantasy-auth-form.scss'
})
export class FantasyRecoverPasswordComponent {
  private readonly router = inject(Router);
  private readonly accountApiService = inject(AccountApiService);
  private readonly messageInfoService = inject(MessageInfoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly expiredHeading = viewChild<ElementRef<HTMLElement>>('expiredHeading');
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  readonly recoverPasswordForm = new FormGroup({
    password1: new FormControl('', { nonNullable: true, validators: [Validators.required, newPasswordValidator] }),
    password2: new FormControl('', { nonNullable: true, validators: Validators.required })
  }, { validators: passwordsMatchValidator('password1', 'password2') });
  readonly formValue = toSignal(this.recoverPasswordForm.valueChanges, { initialValue: this.recoverPasswordForm.getRawValue() });
  readonly serverError = signal(false);
  readonly expired = signal(false);
  readonly pending = signal(false);

  constructor() {
    this.recoverPasswordForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.serverError.set(false));
  }

  passwordError(): string {
    const control = this.recoverPasswordForm.controls.password1;
    if (!control.invalid || !(control.dirty || control.touched)) return '';
    return control.hasError('passwordMin') ? 'La contraseña debe tener al menos 8 caracteres' : 'Necesitas poner una contraseña';
  }

  repeatedError(): string {
    const control = this.recoverPasswordForm.controls.password2;
    if (!(control.dirty || control.touched)) return '';
    return this.recoverPasswordForm.hasError('passwordMismatch') ? 'La contraseña debe ser igual a la anterior' : control.invalid ? 'Necesitas poner la contraseña' : '';
  }

  recoverPassword(): void {
    this.recoverPasswordForm.markAllAsTouched();
    if (this.recoverPasswordForm.invalid || this.pending() || this.expired()) return;
    this.pending.set(true);
    this.accountApiService.changePassword(this.recoverPasswordForm.controls.password1.value, this.token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.pending.set(false);
        this.messageInfoService.showSuccess(response);
        this.router.navigate(['/fantasy/login']);
      },
      error: error => {
        this.pending.set(false);
        this.serverError.set(true);
        if (error.status === 401 || error.status === 403) {
          this.expired.set(true);
          afterNextRender(() => this.expiredHeading()?.nativeElement.focus(), { injector: this.injector });
        }
        this.messageInfoService.showError(ERROR_CHANGE_PASSWORD, error);
      }
    });
  }
}
