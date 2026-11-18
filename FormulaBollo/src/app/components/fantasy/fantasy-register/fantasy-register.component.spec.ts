import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { FantasyRegisterComponent } from './fantasy-register.component';

describe('FantasyRegisterComponent', () => {
  let component: FantasyRegisterComponent;
  let fixture: ComponentFixture<FantasyRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyRegisterComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(FantasyRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('gives both password visibility buttons a minimum touch target', () => {
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('p-inputicon button');
    expect(buttons.length).toBe(2);
    buttons.forEach(button => {
      expect(button.classList).toContain('min-w-6');
      expect(button.classList).toContain('min-h-6');
      expect(button.classList).toContain('md:-m-1');
    });
  });

  it('shows the minimum password length inline', () => {
    const input = fixture.nativeElement.querySelector('[formControlName="password"]');
    input.value = '1234567';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#fantasy-register-password-error').textContent)
      .toContain('La contraseña debe tener al menos 8 caracteres');
    expect(fixture.nativeElement.querySelector('p-button button').disabled).toBeTrue();
    input.value = '12345678';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#fantasy-register-password-error')).toBeNull();
  });
});
