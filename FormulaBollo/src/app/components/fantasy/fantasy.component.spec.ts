import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { FantasyComponent } from './fantasy.component';

describe('FantasyComponent', () => {
  let component: FantasyComponent;
  let fixture: ComponentFixture<FantasyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(FantasyComponent);
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
