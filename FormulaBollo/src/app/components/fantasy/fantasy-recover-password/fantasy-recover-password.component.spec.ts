import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { FantasyRecoverPasswordComponent } from './fantasy-recover-password.component';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { SeasonApiService } from '../../../../shared/services/api/season-api.service';
import { environment } from '../../../../enviroments/enviroment';

describe('FantasyRecoverPasswordComponent', () => {
  let fixture: ComponentFixture<FantasyRecoverPasswordComponent>;
  let component: FantasyRecoverPasswordComponent;
  let http: HttpTestingController;
  const input = (id: string, value: string) => {
    const field = fixture.nativeElement.querySelector('#' + id); field.value = value;
    field.dispatchEvent(new Event('input')); fixture.detectChanges();
  };
  const complete = () => { input('password1', 'nueva-clave'); input('password2', 'nueva-clave'); };
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyRecoverPasswordComponent], providers: [
        ...provideComponentTesting(),
        { provide: SeasonApiService, useValue: { getSeasonOfFantasy: () => of([]) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ token: 'recovery-token' }) } } }
      ]
    }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(FantasyRecoverPasswordComponent); component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController); fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); http.verify(); });

  it('marks requirements, validates mismatches and refuses invalid submissions', () => {
    input('password1', '1234567');
    expect(fixture.nativeElement.querySelector('#password1-error').textContent).toContain('La contraseña debe tener al menos 8 caracteres');
    expect(fixture.nativeElement.querySelector('[type="submit"]').disabled).toBeTrue();
    input('password1', 'é'.repeat(36)); input('password2', 'different');
    expect(fixture.nativeElement.querySelector('#password2-error').textContent).toContain('La contraseña debe ser igual a la anterior');
    input('password2', 'é'.repeat(36));
    expect(fixture.nativeElement.querySelectorAll('[data-satisfied="true"]').length).toBe(2);
    input('password1', '');
    expect(fixture.nativeElement.querySelector('#password1-error').textContent).toContain('Necesitas poner una contraseña');
    component.recoverPassword(); http.expectNone(req => req.url.endsWith('/account/changePassword'));
  });

  it('uses the route token and sends only the new password in the body', () => {
    complete(); component.recoverPassword();
    const request = http.expectOne(`${environment.apiUrl}/account/changePassword`);
    expect(request.request.body).toEqual({ password: 'nueva-clave' });
    expect(request.request.headers.get('Authorization')).toBe('Bearer recovery-token');
    expect(request.request.params.keys()).toEqual([]); request.flush('ok');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/fantasy/login']);
  });

  it('preserves entered passwords after a server error and allows retrying', () => {
    complete(); component.recoverPassword();
    http.expectOne(req => req.url.endsWith('/account/changePassword')).flush('failed', { status: 500, statusText: 'Error' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('No se pudo cambiar la contraseña.');
    expect(component.recoverPasswordForm.controls.password1.value).toBe('nueva-clave');
    expect(fixture.nativeElement.querySelector('[type="submit"]').disabled).toBeFalse();
  });

  for (const status of [401, 403]) {
    it('shows the expired-link state for HTTP ' + status, async () => {
      complete(); component.recoverPassword();
      http.expectOne(req => req.url.endsWith('/account/changePassword')).flush('expired', { status, statusText: 'Expired' }); fixture.detectChanges(); await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('Enlace caducado');
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('h2[tabindex="-1"]'));
      expect(fixture.nativeElement.querySelector('a[routerLink="/fantasy/login"]').getAttribute('href')).toContain('recover=true');
    });
  }
});
