import { Account } from '../../../../shared/models/account';
import { passwordPolicyValidator } from '../../../../shared/validators/password.validators';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, Injector, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Subject, takeUntil } from 'rxjs';
import { AccountApiService } from '../../../../shared/services/api/account-api.service';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { ERROR_LOGIN_CREDENTIALS, ERROR_RECOVER_PASSWORD } from '../../../constants';
import { FantasyAuthLayoutComponent } from '../fantasy-auth-layout/fantasy-auth-layout.component';
import { FantasyPasswordFieldComponent } from '../fantasy-password-field/fantasy-password-field.component';

@Component({
  selector: 'app-fantasy-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputTextModule, ReactiveFormsModule, IconFieldModule, InputIconModule, RouterModule, FantasyAuthLayoutComponent, FantasyPasswordFieldComponent],
  templateUrl: './fantasy-login.component.html',
  styleUrl: '../fantasy-auth-layout/fantasy-auth-form.scss',
  host: { '(keydown.escape)': 'back($event)' }
})
export class FantasyLoginComponent {
  private readonly accountApiService = inject(AccountApiService);
  private readonly messageInfoService = inject(MessageInfoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly recoveryLink = viewChild<ElementRef<HTMLButtonElement>>('recoveryLink');
  private readonly leaveRecovery = new Subject<void>();
  private countdown: ReturnType<typeof setInterval> | undefined;
  readonly loginForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: Validators.required }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, passwordPolicyValidator] })
  });
  readonly mailForm = new FormGroup({
    mail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] })
  });
  readonly loginValue = toSignal(this.loginForm.valueChanges, { initialValue: this.loginForm.getRawValue() });
  readonly mailValue = toSignal(this.mailForm.valueChanges, { initialValue: this.mailForm.getRawValue() });
  readonly step = signal<'login' | 'recover' | 'sent'>('login');
  readonly loginError = signal(false);
  readonly recoveryError = signal(false);
  readonly pending = signal(false);
  readonly remaining = signal(0);
  readonly countdownAnnouncement = signal('');
  readonly sentEmail = signal('');

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopCountdown();
      this.leaveRecovery.complete();
    });
    if (inject(ActivatedRoute).snapshot.queryParamMap?.get('recover') === 'true') this.openRecovery();
    this.loginForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.loginError.set(false));
    this.mailForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.recoveryError.set(false));
  }

  openRecovery(): void {
    this.step.set('recover');
    this.focusHeading();
  }

  back(event?: Event): void {
    if (this.step() === 'login') return;
    event?.preventDefault();
    this.leaveRecovery.next();
    this.pending.set(false);
    this.stopCountdown();
    this.step.set('login');
    this.recoveryError.set(false);
    afterNextRender(() => this.recoveryLink()?.nativeElement.focus(), { injector: this.injector });
  }

  changeEmail(): void {
    this.leaveRecovery.next();
    this.pending.set(false);
    this.recoveryError.set(false);
    this.stopCountdown();
    this.step.set('recover');
    this.focusHeading();
  }

  private focusHeading(): void {
    afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
  }

  private stopCountdown(): void {
    clearInterval(this.countdown);
    this.countdown = undefined;
    this.remaining.set(0);
    this.countdownAnnouncement.set('');
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.remaining.set(60);
    this.countdownAnnouncement.set('Podrás reenviar el enlace en 60 segundos.');
    const availableAt = Date.now() + 60_000;
    this.countdown = setInterval(() => {
      this.remaining.set(Math.max(0, Math.ceil((availableAt - Date.now()) / 1000)));
      if (!this.remaining()) {
        clearInterval(this.countdown);
        this.countdown = undefined;
        this.countdownAnnouncement.set('Ya puedes reenviar el enlace.');
      }
    }, 1000);
  }

  login(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid || this.pending()) return;
    this.pending.set(true);
    const { username, password } = this.loginForm.getRawValue();
    this.accountApiService.login(new Account(username, password)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: token => {
        this.pending.set(false);
        localStorage.setItem('auth', token);
        this.messageInfoService.showSuccess('Has iniciado sesión correctamente.');
        this.router.navigate(['/fantasy']);
      },
      error: error => {
        this.pending.set(false);
        this.loginError.set(true);
        this.messageInfoService.showError(ERROR_LOGIN_CREDENTIALS, error);
      }
    });
  }

  recoverPassword(): void {
    this.mailForm.markAllAsTouched();
    if (this.mailForm.invalid || this.pending() || this.remaining() || this.step() === 'login') return;
    const email = this.step() === 'sent' ? this.sentEmail() : this.mailForm.controls.mail.value;
    this.pending.set(true);
    this.recoveryError.set(false);
    this.accountApiService.recoverPassword(email).pipe(takeUntil(this.leaveRecovery), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.pending.set(false);
        this.messageInfoService.showSuccess('Enlace enviado al correo correctamente');
        this.sentEmail.set(email);
        this.step.set('sent');
        this.startCountdown();
        this.focusHeading();
      },
      error: error => {
        this.pending.set(false);
        this.recoveryError.set(true);
        this.messageInfoService.showError(ERROR_RECOVER_PASSWORD, error);
      }
    });
  }
}
