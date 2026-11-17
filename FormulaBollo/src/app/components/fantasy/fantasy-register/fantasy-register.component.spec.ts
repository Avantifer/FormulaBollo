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
