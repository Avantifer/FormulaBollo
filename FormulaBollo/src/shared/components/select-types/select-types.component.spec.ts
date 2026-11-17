import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormGroupDirective } from '@angular/forms';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { SelectTypeComponent } from './select-types.component';

describe('SelectTypeComponent', () => {
  let component: SelectTypeComponent;
  let fixture: ComponentFixture<SelectTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectTypeComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(SelectTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults to drivers and emits each chosen type once', () => {
    const form = fixture.debugElement.query(By.directive(FormGroupDirective)).injector.get(FormGroupDirective).form;
    const emit = spyOn(component.typeChanged, 'emit');
    expect(form.get('type')!.value).toBe('Pilotos');
    form.get('type')!.setValue('Equipos');
    expect(emit).toHaveBeenCalledOnceWith('Equipos');
    form.get('type')!.setValue('Pilotos');
    expect(emit.calls.allArgs()).toEqual([['Equipos'], ['Pilotos']]);
  });
});
