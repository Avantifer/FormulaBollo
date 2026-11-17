import { newPasswordValidator, passwordsMatchValidator } from '../../../../shared/validators/password.validators';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AccountApiService } from '../../../../shared/services/api/account-api.service';
import { Account } from '../../../../shared/models/account';
import { catchError, of, Subject, takeUntil } from 'rxjs';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { SUCCESS_REGISTER } from '../../../constants';

@Component({
  selector: 'app-fantasy-register',
  imports: [
    InputTextModule,
    FormsModule,
    ReactiveFormsModule,
    IconFieldModule,
    InputIconModule,
    ButtonModule,
    RouterModule
  ],
  templateUrl: './fantasy-register.component.html',
  styleUrl: './fantasy-register.component.scss'
})
export class FantasyRegisterComponent {
  private readonly accountApiService: AccountApiService = inject(AccountApiService);
  private readonly router: Router = inject(Router);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);

  protected registerForm: FormGroup = new FormGroup({
    username: new FormControl('', Validators.required),
    mail: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, newPasswordValidator]),
    passwordRepeated: new FormControl('', Validators.required),
  }, { validators: passwordsMatchValidator('password', 'passwordRepeated') });
  showPassword: boolean = false;
  showPasswordRepeated: boolean = false;

  private readonly destroy$: Subject<void> = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  register(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) return;
    const account: Account = new Account(
      0,
      this.registerForm.get("username")!.value,
      this.registerForm.get("password")!.value,
      this.registerForm.get("mail")!.value,
      0,
    );

    this.accountApiService.register(account).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.messageInfoService.showError(error.error, error);
        console.error(error);
        return of();
      })
    ).subscribe((token: string) => {
      localStorage.setItem("auth", token);
      this.router.navigate(["/fantasy"]);
      this.messageInfoService.showSuccess(SUCCESS_REGISTER);
    });
  }
}
