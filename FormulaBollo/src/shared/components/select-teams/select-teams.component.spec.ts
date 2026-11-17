import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { SelectTeamsComponent } from './select-teams.component';

describe('SelectTeamsComponent', () => {
  let component: SelectTeamsComponent;
  let fixture: ComponentFixture<SelectTeamsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectTeamsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(SelectTeamsComponent);
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
