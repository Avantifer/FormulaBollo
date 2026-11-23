import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-fantasy-password-requirements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fantasy-password-requirements.component.html'
})
export class FantasyPasswordRequirementsComponent {
  readonly password = input('');
  readonly repeated = input('');
  readonly policyId = input.required<string>();
  readonly characters = computed(() => Array.from(this.password()).length);
  readonly matches = computed(() => !!this.password() && this.password() === this.repeated());
  readonly strength = computed(() => this.characters() < 8 ? 'Insuficiente' : this.characters() >= 12 ? 'Alta' : 'Media');
  readonly bars = computed(() => this.characters() < 8 ? 1 : this.characters() >= 12 ? 4 : 2);
  readonly rules = computed(() => [
    { label: 'Mínimo 8 caracteres', good: this.characters() >= 8, detail: this.characters() < 8 ? this.characters() + ' de 8 caracteres' : this.characters() + ' caracteres' },
    { label: 'Las contraseñas coinciden', good: this.matches(), detail: this.matches() ? 'Coinciden' : 'Todavía no coinciden' }
  ]);
}
