import { TestBed } from '@angular/core/testing';
import { FantasyPasswordRequirementsComponent } from './fantasy-password-requirements.component';

describe('FantasyPasswordRequirementsComponent', () => {
  it('counts Unicode characters and marks matching passwords', () => {
    const fixture = TestBed.createComponent(FantasyPasswordRequirementsComponent);
    fixture.componentRef.setInput('policyId', 'policy');
    const set = (password: string, repeated = password) => {
      fixture.componentRef.setInput('password', password);
      fixture.componentRef.setInput('repeated', repeated);
      fixture.detectChanges();
    };
    set('😀'.repeat(4));
    expect(fixture.componentInstance.characters()).toBe(4);
    expect(fixture.componentInstance.rules().map(rule => rule.good)).toEqual([false, true]);
    set('😀'.repeat(8));
    expect(fixture.componentInstance.rules().every(rule => rule.good)).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('8 caracteres');
    set('😀'.repeat(8), 'different');
    expect(fixture.componentInstance.rules().map(rule => rule.good)).toEqual([true, false]);
    expect(fixture.nativeElement.querySelectorAll('[data-satisfied="false"] .pi-times-circle').length).toBe(1);
    set('');
    expect(fixture.componentInstance.matches()).toBeFalse();
    fixture.destroy();
  });
});
