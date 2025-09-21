import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'select-type',
  imports: [ReactiveFormsModule, SelectModule],
  templateUrl: './select-types.component.html',
  styleUrl: './select-types.component.scss'
})
export class SelectTypeComponent {
  @Output() typeChanged = new EventEmitter<string>();

  protected types: string[] = ["Pilotos", "Equipos"];
  
  protected typesForm: FormGroup = new FormGroup({
    type: new FormControl(this.types[0])
  });

  ngOnInit(): void {
    this._changeTypeListener();
  }

  private _changeTypeListener(): void {
    this.typesForm.get('type')!.valueChanges
      .subscribe((newType) => {
        this.typeChanged.emit(newType);
      });
  }
}
