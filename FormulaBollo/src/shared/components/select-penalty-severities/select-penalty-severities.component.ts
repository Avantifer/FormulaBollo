import { Component, EventEmitter, inject, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { PenaltySeverityApiService } from '../../services/api/penalty-severity-api.service';
import { MessageInfoService } from '../../services/toastInfo.service';
import { PenaltySeverity } from '../../models/penaltySeverity';
import { ERROR_PENALTIES_FETCH } from '../../../app/constants';

@Component({
  selector: 'select-penalty-severities',
  imports: [ReactiveFormsModule, SelectModule],
  templateUrl: './select-penalty-severities.component.html',
  styleUrl: './select-penalty-severities.component.scss'
})
export class SelectPenaltySeveritiesComponent {
  private readonly penaltySeverityApiService: PenaltySeverityApiService = inject(PenaltySeverityApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  @Output() penaltySeverityChanged = new EventEmitter<PenaltySeverity>();
  
  public penaltySeverities: PenaltySeverity[] = [];
  public penaltySeveritiesForm: FormGroup = new FormGroup({
    penaltySeverity: new FormControl<PenaltySeverity | null>(null)
  });

  ngOnInit(): void {
    this.obtainAllPenaltySeverities();
    this.changePenaltySeverityListener();
  }

  changePenaltySeverityListener(): void {
    this.penaltySeveritiesForm.get('penaltySeverity')?.valueChanges
      .subscribe((newPenaltySeverity) => {
        this.penaltySeverityChanged.emit(newPenaltySeverity);
      });
  }

  obtainAllPenaltySeverities(): void {
    this.penaltySeverityApiService.getAllPenaltiesSeverity()
      .subscribe({
        next: (penaltySeverities) => {
          this.penaltySeverities = penaltySeverities;
          if (this.penaltySeverities.length > 0) {
            setTimeout(() => {
              this.penaltySeveritiesForm.get('penaltySeverity')?.setValue(this.penaltySeverities[0]);
            });
          }
        },
        error: (error) => {
          this.messageInfoService.showError(ERROR_PENALTIES_FETCH, error);
          console.error(error);
        }
      });
  }
}
