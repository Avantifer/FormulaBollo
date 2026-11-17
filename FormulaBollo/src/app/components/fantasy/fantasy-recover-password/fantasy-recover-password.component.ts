import { passwordPolicyValidator, passwordsMatchValidator } from '../../../../shared/validators/password.validators';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AccountApiService } from '../../../../shared/services/api/account-api.service';
import { catchError, of, Subject, takeUntil } from 'rxjs';
import { ERROR_CHANGE_PASSWORD } from '../../../constants';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';

@Component({
  selector: 'app-fantasy-recover-password',
  imports: [
    InputTextModule,
    FormsModule,
    ReactiveFormsModule,
    IconFieldModule,
    InputIconModule,
    ButtonModule
  ],
  templateUrl: './fantasy-recover-password.component.html',
  styleUrl: './fantasy-recover-password.component.scss'
})
export class FantasyRecoverPasswordComponent {
  private readonly router: Router = inject(Router);
  private readonly accountApiService: AccountApiService = inject(AccountApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);

  private readonly token: string = this.router.url.split("/")[3];
  protected showPassword1: boolean = false;
  protected showPassword2: boolean = false;
  private readonly destroy$: Subject<void> = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected recoverPasswordForm: FormGroup = new FormGroup({
    password1: new FormControl('', [Validators.required, passwordPolicyValidator]),
    password2: new FormControl('', Validators.required),
  }, { validators: passwordsMatchValidator('password1', 'password2') });

  recoverPassword(): void {
    this.recoverPasswordForm.markAllAsTouched();
    if (this.recoverPasswordForm.invalid) return;
    const password: string = this.recoverPasswordForm.get("password1")?.value;

    this.accountApiService
      .changePassword(password, this.token)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.messageInfoService.showError(ERROR_CHANGE_PASSWORD, error);
          console.error(error);
          return of();
        })
      )
      .subscribe((response: string) => {
          this.messageInfoService.showSuccess(response);
          this.router.navigate(["/fantasy/login"]);
        
      });
  }
}
