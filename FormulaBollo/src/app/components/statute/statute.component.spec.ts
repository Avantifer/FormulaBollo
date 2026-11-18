import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { StatuteComponent } from './statute.component';

describe('StatuteComponent', () => {
  let component: StatuteComponent;
  let fixture: ComponentFixture<StatuteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatuteComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(StatuteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps one accessible heading, the PDF object and a safe fallback download link', () => {
    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].classList).toContain('sr-only');
    expect(headings[0].textContent).toBe('Estatuto');

    const pdf: HTMLObjectElement = fixture.nativeElement.querySelector('object');
    expect(pdf.getAttribute('data')).toBe('/assets/archives/estatutoF1Bollo.pdf');
    expect(pdf.getAttribute('type')).toBe('application/pdf');
    const fallback = pdf.querySelector('a')!;
    expect(fallback.getAttribute('href')).toBe(pdf.getAttribute('data'));
    expect(fallback.target).toBe('_blank');
    expect(fallback.relList.contains('noopener')).toBeTrue();
    expect(fallback.relList.contains('noreferrer')).toBeTrue();
    expect(fallback.textContent).toBe('Descargar PDF');
  });
});
