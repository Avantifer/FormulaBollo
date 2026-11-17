import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { FantasyRecoverPasswordComponent } from './fantasy-recover-password.component';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { environment } from '../../../../enviroments/enviroment';

describe('FantasyRecoverPasswordComponent', () => {
  let component: FantasyRecoverPasswordComponent;
  let fixture: ComponentFixture<FantasyRecoverPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyRecoverPasswordComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ token: 'recovery-token' }) } } }
      ],
    }).compileComponents();

    spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue('/fantasy/recoverPassword/recovery-token?utm=1#x');
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(FantasyRecoverPasswordComponent);
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
    const input = fixture.nativeElement.querySelector('#password1');
    input.value = '1234567';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#fantasy-recover-password-password1-error').textContent)
      .toContain('La contraseña debe tener al menos 8 caracteres');
    expect(fixture.nativeElement.querySelector('p-button button').disabled).toBeTrue();
  });

  it('usa el token del enlace y envía únicamente la contraseña en el cuerpo', () => {
    const input = fixture.nativeElement.querySelector('input');
    input.value = 'nueva-clave';
    input.dispatchEvent(new Event('input'));
    const repeated = fixture.nativeElement.querySelector('#password2');
    repeated.value = 'nueva-clave';
    repeated.dispatchEvent(new Event('input'));

    component.recoverPassword();

    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne(`${environment.apiUrl}/account/changePassword`);
    expect(request.request.body).toEqual({ password: 'nueva-clave' });
    expect(request.request.headers.get('Authorization')).toBe('Bearer recovery-token');
    expect(request.request.params.keys()).toEqual([]);
    request.flush('ok');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/fantasy/login']);
    http.verify();
  });
});
