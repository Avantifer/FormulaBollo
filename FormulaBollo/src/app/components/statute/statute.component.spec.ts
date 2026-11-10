import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
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
});
