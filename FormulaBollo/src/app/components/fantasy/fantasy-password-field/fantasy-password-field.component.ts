import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-fantasy-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconFieldModule, InputIconModule, InputTextModule],
  templateUrl: './fantasy-password-field.component.html',
  styleUrl: '../fantasy-auth-layout/fantasy-auth-form.scss'
})
export class FantasyPasswordFieldComponent {
  readonly control = input.required<FormControl>();
  readonly fieldId = input.required<string>();
  readonly label = input('Contraseña');
  readonly autocomplete = input('new-password');
  readonly placeholder = input('');
  readonly error = input('');
  readonly describedBy = input('');
  readonly visible = signal(false);
}
