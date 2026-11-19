import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should align the title using the shared container and accent border', () => {
    const title: HTMLHeadingElement = fixture.nativeElement.querySelector('h1');

    expect(title.parentElement?.classList.contains('my-container')).toBeTrue();
    expect(title.classList.contains('border-accent')).toBeTrue();
  });
});
