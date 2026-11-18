import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { FantasyLoginComponent } from './fantasy-login.component';

describe('FantasyLoginComponent', () => {
  let component: FantasyLoginComponent;
  let fixture: ComponentFixture<FantasyLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyLoginComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(FantasyLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('gives the password visibility button a minimum touch target', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('p-inputicon button');
    expect(button.classList).toContain('min-w-6');
    expect(button.classList).toContain('min-h-6');
    expect(button.classList).toContain('md:-m-1');
  });

  it('accepts a three-character password for a legacy account', () => {
    const username = fixture.nativeElement.querySelector('[formControlName="username"]');
    const password = fixture.nativeElement.querySelector('[formControlName="password"]');
    username.value = 'legacy-user';
    username.dispatchEvent(new Event('input'));
    password.value = 'abc';
    password.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(password.getAttribute('aria-invalid')).toBe('false');
    expect(fixture.nativeElement.querySelector('p-button button').disabled).toBeFalse();
  });
});
