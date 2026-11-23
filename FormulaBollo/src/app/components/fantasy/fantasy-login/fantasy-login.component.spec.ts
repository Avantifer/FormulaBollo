import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { SeasonApiService } from '../../../../shared/services/api/season-api.service';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { FantasyLoginComponent } from './fantasy-login.component';

describe('FantasyLoginComponent', () => {
  let fixture: ComponentFixture<FantasyLoginComponent>;
  let component: FantasyLoginComponent;
  let http: HttpTestingController;
  const root = (): HTMLElement => fixture.nativeElement;
  const input = (id: string, value: string) => {
    const field = root().querySelector<HTMLInputElement>('#' + id)!;
    field.value = value; field.dispatchEvent(new Event('input')); fixture.detectChanges();
  };
  const button = (text: string) => Array.from(root().querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent!.trim() === text)!;
  const open = async () => { button('Recuperar contraseña').click(); fixture.detectChanges(); await fixture.whenStable(); };
  const send = () => {
    input('fantasy-login-mail', 'user@example.com'); button('Enviar enlace').click();
    http.expectOne(req => req.url.endsWith('/account/recoverPassword')).flush('ok'); fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyLoginComponent],
      providers: [...provideComponentTesting(), { provide: SeasonApiService, useValue: { getSeasonOfFantasy: () => of([]) } }]
    }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(FantasyLoginComponent); component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController); fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); http.verify({ ignoreCancelled: true }); localStorage.clear(); });

  it('disables invalid login, labels fields and accepts legacy short passwords', () => {
    expect(button('Iniciar sesión').disabled).toBeTrue();
    component.login(); http.expectNone(req => req.url.endsWith('/account/login'));
    fixture.detectChanges();
    expect(root().querySelector('#fantasy-login-username-error')!.textContent).toContain('Necesitas poner el nombre de usuario');
    for (const id of ['fantasy-login-username', 'fantasy-login-password']) {
      expect(root().querySelector('label[for="' + id + '"]')).not.toBeNull();
    }
    input('fantasy-login-username', 'legacy-user'); input('fantasy-login-password', 'abc');
    expect(button('Iniciar sesión').disabled).toBeFalse();
    expect(root().querySelector('input[type="password"]')!.getAttribute('autocomplete')).toBe('current-password');
    button('Iniciar sesión').click();
    const request = http.expectOne(req => req.url.endsWith('/account/login'));
    expect(request.request.body.username).toBe('legacy-user'); request.flush('test-token');
    expect(localStorage.getItem('auth')).toBe('test-token');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/fantasy']);
  });

  it('shows the system toast and inline login error, clearing it when typing again', () => {
    const toast = spyOn(TestBed.inject(MessageInfoService), 'showError');
    const firstTry = 'abc';
    input('fantasy-login-username', 'user'); input('fantasy-login-password', firstTry); button('Iniciar sesión').click();
    http.expectOne(req => req.url.endsWith('/account/login')).flush('failed', { status: 401, statusText: 'Unauthorized' }); fixture.detectChanges();
    expect(root().querySelector('[role="alert"]')!.textContent).toContain('No has podido entrar');
    expect(toast).toHaveBeenCalledWith('Credenciales incorrectas.', jasmine.anything());
    input('fantasy-login-password', firstTry + 'd'); expect(root().querySelector('[role="alert"]')).toBeNull();
  });

  it('toggles password visibility with a pressed state', () => {
    const toggle = root().querySelector<HTMLButtonElement>('app-fantasy-password-field button')!;
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(root().querySelector<HTMLInputElement>('#fantasy-login-password')!.type).toBe('text');
  });

  it('opens recovery in the panel, focuses its heading and validates email', async () => {
    await open();
    expect(document.activeElement).toBe(root().querySelector('h1'));
    expect(root().querySelector('p-dialog')).toBeNull();
    expect(button('Enviar enlace').disabled).toBeTrue();
    input('fantasy-login-mail', 'incorrect');
    expect(root().querySelector('#fantasy-login-mail-error')!.textContent).toContain('Correo incorrecto.');
    expect(root().querySelector('#fantasy-login-mail')!.getAttribute('aria-invalid')).toBe('true');
    expect(root().querySelector('.pi-envelope')).not.toBeNull();
  });

  it('sends email, shows the sent address and enforces a real 60 second resend cooldown', async () => {
    await open();
    jasmine.clock().install(); jasmine.clock().mockDate(new Date());
    try {
      send();
      expect(root().querySelector('h1')!.textContent).toContain('Revisa tu correo');
      expect(root().querySelector('[aria-label="Enlace enviado"]')!.textContent).toContain('user@example.com');
      expect(button('Reenviar enlace').disabled).toBeTrue();
      component.recoverPassword(); http.expectNone(req => req.url.endsWith('/account/recoverPassword'));
      jasmine.clock().tick(1000); fixture.detectChanges(); expect(root().textContent).toContain('59 s');
      expect(root().querySelector('[aria-live="polite"]')!.textContent).toContain('60 segundos');
      jasmine.clock().tick(58000); fixture.detectChanges(); expect(button('Reenviar enlace').disabled).toBeTrue();
      jasmine.clock().tick(1000); fixture.detectChanges(); expect(button('Reenviar enlace').disabled).toBeFalse();
      expect(root().querySelector('[aria-live="polite"]')!.textContent).toContain('Ya puedes reenviar');
      button('Reenviar enlace').click();
      const request = http.expectOne(req => req.url.endsWith('/account/recoverPassword'));
      expect(request.request.params.get('email')).toBe('user@example.com'); request.flush('ok'); fixture.detectChanges();
      expect(component.remaining()).toBe(60); expect(button('Reenviar enlace').disabled).toBeTrue();
      fixture.destroy(); jasmine.clock().tick(61000); expect(component.remaining()).toBe(0);
    } finally { jasmine.clock().uninstall(); }
  });

  it('shows recovery errors inline and preserves the input', async () => {
    await open(); input('fantasy-login-mail', 'unknown@example.com'); button('Enviar enlace').click();
    http.expectOne(req => req.url.endsWith('/account/recoverPassword')).flush('failed', { status: 400, statusText: 'Bad Request' }); fixture.detectChanges();
    expect(root().querySelector('[role="alert"]')!.textContent).toContain('Correo incorrecto.');
    expect(root().querySelector<HTMLInputElement>('#fantasy-login-mail')!.value).toBe('unknown@example.com');
  });

  for (const escape of [false, true]) {
    it('returns focus to the recovery trigger with ' + (escape ? 'Escape' : 'Volver'), async () => {
      await open();
      if (escape) root().querySelector('h1')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      else button('Volver').click();
      fixture.detectChanges(); await fixture.whenStable();
      expect(component.step()).toBe('login'); expect(document.activeElement).toBe(button('Recuperar contraseña'));
    });
  }

  it('cancels pending recovery when leaving and stops the countdown when returning', async () => {
    await open(); input('fantasy-login-mail', 'user@example.com'); button('Enviar enlace').click();
    const request = http.expectOne(req => req.url.endsWith('/account/recoverPassword'));
    component.back(); fixture.detectChanges(); expect(request.cancelled).toBeTrue(); expect(component.pending()).toBeFalse();
    await open(); jasmine.clock().install(); jasmine.clock().mockDate(new Date());
    try { send(); component.back(); jasmine.clock().tick(61000); expect(component.remaining()).toBe(0); } finally { jasmine.clock().uninstall(); }
  });

  it('uses elapsed time after a delayed timer and clears it when changing the email', async () => {
    await open(); jasmine.clock().install(); jasmine.clock().mockDate(new Date());
    try {
      send();
      jasmine.clock().mockDate(new Date(Date.now() + 60000));
      jasmine.clock().tick(1000); fixture.detectChanges();
      expect(button('Reenviar enlace').disabled).toBeFalse();
      button('Reenviar enlace').click();
      http.expectOne(req => req.url.endsWith('/account/recoverPassword')).flush('ok'); fixture.detectChanges();
      button('Cambiar correo').click(); fixture.detectChanges();
      expect(component.step()).toBe('recover'); expect(component.remaining()).toBe(0);
      jasmine.clock().tick(61000); expect(component.remaining()).toBe(0);
    } finally { jasmine.clock().uninstall(); }
  });

  it('returns focus and clears the cooldown with Escape from the sent step', async () => {
    await open(); send();
    root().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges(); await fixture.whenStable();
    expect(component.remaining()).toBe(0); expect(document.activeElement).toBe(button('Recuperar contraseña'));
  });

  it('opens recovery from the expired-link action', async () => {
    fixture.destroy();
    Object.assign(TestBed.inject(ActivatedRoute).snapshot, { queryParamMap: convertToParamMap({ recover: 'true' }) });
    fixture = TestBed.createComponent(FantasyLoginComponent); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.step()).toBe('recover');
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('h1'));
  });
});
