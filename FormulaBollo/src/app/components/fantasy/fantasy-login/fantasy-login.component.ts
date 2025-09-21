import { Account } from './../../../../shared/models/account';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AccountApiService } from '../../../../shared/services/api/account-api.service';
import { catchError, of, Subject, takeUntil } from 'rxjs';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { ERROR_LOGIN_CREDENTIALS, ERROR_RECOVER_PASSWORD } from '../../../constants';

@Component({
  selector: 'app-fantasy-login',
  imports: [
    InputTextModule,
    FormsModule,
    ReactiveFormsModule,
    IconFieldModule,
    InputIconModule,
    DialogModule,
    ButtonModule,
    RouterModule
  ],
  templateUrl: './fantasy-login.component.html',
  styleUrl: './fantasy-login.component.scss'
})
export class FantasyLoginComponent {
  private readonly accountApiService: AccountApiService = inject(AccountApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly router: Router = inject(Router);

  protected loginForm: FormGroup = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });

  protected mailForm: FormGroup = new FormGroup({
    mail: new FormControl('', [Validators.required, Validators.email])
  });

  protected showPassword: boolean = false;
  protected recoveryPasswordDialog: boolean = false;
  private readonly destroy$: Subject<void> = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  login(): void {
    const account: Account = new Account(this.loginForm.get('username')!.value, this.loginForm.get('password')!.value);
    this.accountApiService.login(account).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.messageInfoService.showError(ERROR_LOGIN_CREDENTIALS, error);
        console.error(error);
        return of();
      })
    ).subscribe((token: string) => {
      localStorage.setItem("auth", token);
      this.messageInfoService.showSuccess('Has iniciado sesión correctamente.');
      this.router.navigate(['/fantasy']);
    }); 
  }

  recoverPassword(): void {
    this.accountApiService.recoverPassword(this.mailForm.get('mail')!.value).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.messageInfoService.showError(ERROR_RECOVER_PASSWORD, error);
        console.error(error);
        return of();
      })
    ).subscribe(() => {
      this.messageInfoService.showSuccess('Enlace enviado al correo correctamente');
      this.recoveryPasswordDialog = false;
    }); 
  }
}
