import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { FantasyRegisterComponent } from './fantasy-register.component';

describe('FantasyRegisterComponent', () => {
  let component: FantasyRegisterComponent;
  let fixture: ComponentFixture<FantasyRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyRegisterComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(FantasyRegisterComponent);
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
