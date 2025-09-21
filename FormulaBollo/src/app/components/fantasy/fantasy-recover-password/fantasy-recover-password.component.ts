import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AuthJWTService } from '../../../../shared/services/authJWT.service';
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
  private readonly authJWTService: AuthJWTService = inject(AuthJWTService);
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
    password1: new FormControl('', Validators.required),
    password2: new FormControl('', [
      Validators.required,
      this.passwordMatchValidator(),
    ]),
  });

  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: unknown } | null => {
      const password = control.parent?.get("password1")?.value;
      const passwordRepeated = control.value;
      return password === passwordRepeated ? null : { passwordMismatch: true };
    };
  }

  recoverPassword(): void {
    const username: string = this.authJWTService.getUsernameFromToken(
      this.token,
    );
    const password: string = this.recoverPasswordForm.get("password1")?.value;

    this.accountApiService
      .changePassword(username, password)
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
