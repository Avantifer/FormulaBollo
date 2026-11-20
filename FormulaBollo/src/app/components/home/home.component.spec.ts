import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { HomeComponent } from './home.component';
import { ImageService } from '../../../shared/services/image.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(ImageService), 'getImageUrl').and.callThrough();
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

  it('keeps the normal hero image eager and high priority for LCP', () => {
    const image = fixture.nativeElement.querySelector('.principal-image img') as HTMLImageElement;
    expect(TestBed.inject(ImageService).getImageUrl).toHaveBeenCalledWith('intro/introImage-v4.avif');
    expect(image.getAttribute('src')).toBe(TestBed.inject(ImageService).getImageUrl('intro/introImage-v4.avif'));
    expect(image.loading).toBe('eager');
    expect(image.getAttribute('fetchpriority')).toBe('high');
    expect(image.getAttribute('alt')).toBe('');
  });

  it('removes a failed hero image while preserving height, pit background and title in both themes', () => {
    const hero = fixture.nativeElement.querySelector('.principal-image') as HTMLElement;
    const height = hero.getBoundingClientRect().height;
    expect(height).toBeGreaterThan(0);
    hero.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    try {
      for (const dark of [false, true]) {
        root.classList.toggle('dark', dark);
        expect(hero.querySelector('img')).toBeNull();
        expect(hero.getBoundingClientRect().height).toBe(height);
        expect(getComputedStyle(hero).backgroundColor).toBe(dark ? 'rgb(8, 9, 11)' : 'rgb(20, 23, 27)');
        const title = hero.querySelector('h1')!;
        expect(title.textContent!.trim()).toBe('Formula Bollo');
        expect(getComputedStyle(title).color).toBe('rgb(255, 255, 255)');
      }
    } finally { root.classList.toggle('dark', wasDark); }
  });
});
