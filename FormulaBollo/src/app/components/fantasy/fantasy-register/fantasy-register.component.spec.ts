import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { SeasonApiService } from '../../../../shared/services/api/season-api.service';
import { FantasyRegisterComponent } from './fantasy-register.component';

describe('FantasyRegisterComponent', () => {
  let fixture: ComponentFixture<FantasyRegisterComponent>;
  let http: HttpTestingController;
  const input = (id: string, value: string) => {
    const field = fixture.nativeElement.querySelector('#fantasy-register-' + id);
    field.value = value; field.dispatchEvent(new Event('input')); fixture.detectChanges();
  };
  const complete = () => {
    input('username', 'user'); input('mail', 'user@example.com'); input('password', 'nueva-clave'); input('passwordRepeated', 'nueva-clave');
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FantasyRegisterComponent], providers: [...provideComponentTesting(), { provide: SeasonApiService, useValue: { getSeasonOfFantasy: () => of([]) } }] }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(FantasyRegisterComponent); http = TestBed.inject(HttpTestingController); fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); http.verify(); localStorage.clear(); });

  it('marks requirements while typing, preserves exact errors and rejects mismatches', () => {
    expect(fixture.nativeElement.querySelector('[type="submit"]').disabled).toBeTrue();
    input('password', '1234567');
    expect(fixture.nativeElement.querySelector('#fantasy-register-password-error').textContent).toContain('La contraseña debe tener al menos 8 caracteres');
    input('password', '😀'.repeat(8)); input('passwordRepeated', 'different');
    expect(fixture.nativeElement.querySelector('#fantasy-register-passwordRepeated-error').textContent).toContain('La contraseña debe ser igual a la anterior');
    expect(fixture.nativeElement.querySelectorAll('[data-satisfied="true"]').length).toBe(1);
    input('passwordRepeated', '😀'.repeat(8));
    expect(fixture.nativeElement.querySelectorAll('[data-satisfied="true"]').length).toBe(2);
    input('password', '');
    expect(fixture.nativeElement.querySelector('#fantasy-register-password-error').textContent).toContain('Necesitas poner una contraseña');
    fixture.componentInstance.register(); http.expectNone(req => req.url.endsWith('/account/register'));
  });

  it('validates email and shows server errors as an alert without losing fields', () => {
    input('mail', 'incorrect');
    expect(fixture.nativeElement.querySelector('#fantasy-register-mail-error').textContent).toContain('Necesitas poner un correo correcto.');
    complete(); fixture.componentInstance.register();
    http.expectOne(req => req.url.endsWith('/account/register')).flush('Usuario o correo ya existente', { status: 409, statusText: 'Conflict' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Usuario o correo ya existente');
    expect(fixture.componentInstance.registerForm.controls.username.value).toBe('user');
    input('username', 'new-user'); expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps automatic authentication and navigation after successful registration', () => {
    complete(); fixture.nativeElement.querySelector('[type="submit"]').click();
    const request = http.expectOne(req => req.url.endsWith('/account/register'));
    expect(request.request.body.email).toBe('user@example.com'); request.flush('test-token'); fixture.detectChanges();
    expect(localStorage.getItem('auth')).toBe('test-token');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/fantasy']);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Te has registrado correctamente');
  });
});
