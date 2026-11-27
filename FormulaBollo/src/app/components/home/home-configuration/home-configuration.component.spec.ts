import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { HomeConfigurationComponent } from './home-configuration.component';
import { HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { AppComponent } from '../../../app.component';
import { CacheService } from '../../../../shared/services/cache.service';
import { WebSocketService } from '../../../../shared/services/websocket.service';
import { UtilsService } from '../../../../shared/services/utils.service';

describe('HomeConfigurationComponent', () => {
  let component: HomeConfigurationComponent;
  let fixture: ComponentFixture<HomeConfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeConfigurationComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(HomeConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('Home configuration version failure regression', () => {
  let app: ComponentFixture<AppComponent>;
  let fixture: ComponentFixture<HomeConfigurationComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({ providers: [
      ...provideComponentTesting(),
      { provide: WebSocketService, useValue: {
        connected$: new Subject<void>(), getMessages: () => new Subject<number>(), closeConnection: () => {}
      } }
    ] });
    http = TestBed.inject(HttpTestingController);
    app = TestBed.createComponent(AppComponent);
    app.detectChanges();
    fixture = TestBed.createComponent(HomeConfigurationComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    app.destroy();
    http.verify();
    TestBed.inject(CacheService).clearCache();
    localStorage.clear();
    jasmine.clock().uninstall();
  });

  it('F: shows loaded configurations and removes the skeleton when the version check fails', () => {
    http.expectOne(r => r.url.endsWith('/configurations/all')).flush([
      { id: 1, setting: 'Race distance', settingValue: '50%' }
    ]);
    http.expectOne(r => r.url.endsWith('/cache/current')).flush('offline', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Race distance');
    expect(fixture.nativeElement.textContent).toContain('50%');
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
  });

  it('keeps the skeleton until configurations arrive and ends loading for an empty response', () => {
    http.expectOne(r => r.url.endsWith('/cache/current')).flush(31);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
    http.expectOne(r => r.url.endsWith('/configurations/all')).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pi-cog')).toBeNull();
  });

  it('ends loading after a configuration error while the version check is still pending', () => {
    const handleError = spyOn(TestBed.inject(UtilsService), 'handleError').and.callThrough();
    http.expectOne(r => r.url.endsWith('/configurations/all')).flush('offline', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pi-cog')).toBeNull();
    expect(handleError).toHaveBeenCalled();
    http.expectOne(r => r.url.endsWith('/cache/current')).flush(31);
  });
});
