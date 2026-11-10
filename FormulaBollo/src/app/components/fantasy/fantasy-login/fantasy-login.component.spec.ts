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
});
