import { CommonModule } from '@angular/common';
import { Component, effect, EventEmitter, inject, Input, input, InputSignal, Output } from '@angular/core';
import { MessageInfoService } from '../../services/toastInfo.service';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Season } from '../../models/season';
import { environment } from '../../../enviroments/enviroment';
import { ERROR_TEAM_FETCH } from '../../../app/constants';
import { SpaceToUnderscorePipe } from '../../pipes/spaceToUnderscore.pipe';
import { Team } from '../../models/team';
import { TeamApiService } from '../../services/api/team-api.service';

@Component({
  selector: 'select-teams',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    SpaceToUnderscorePipe
  ],
  templateUrl: './select-teams.component.html',
  styleUrls: ['./select-teams.component.scss']
})
export class SelectTeamsComponent {
  private readonly teamApiService: TeamApiService = inject(TeamApiService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);

  @Output() teamChanged = new EventEmitter<Team>();
  @Input() position!: number;
  readonly season: InputSignal<Season> = input(environment.seasonActual);
  private previousSeasonSelected?: Season;
  public teams: Team[] = [];
  public teamsForm: FormGroup = new FormGroup({
    team: new FormControl()
  });


  constructor() {
    effect(() => {
      const currentSeason = this.season();

      if (currentSeason && currentSeason !== this.previousSeasonSelected) {
        this.obtainAllTeams();
      }

      this.previousSeasonSelected = currentSeason;
    });
  }

  ngOnInit(): void {
    this.changeTeamListener();
  }

  changeTeamListener(): void {
    this.teamsForm.get('team')?.valueChanges
      .subscribe((newTeam) => {
        this.teamChanged.emit(newTeam);
      });
  }

  obtainAllTeams(): void {
    this.teamApiService
    .getAllTeams(this.season().number)
    .subscribe({
      next: (teams: Team[]) => {
        this.teams = teams;
        this.teamsForm.get('team')?.setValue(teams[this.position]);
      },
      error: (error) => {
        this.messageInfoService.showError(ERROR_TEAM_FETCH, error);
        console.log(error);
        throw error;
      }
    }); 
  }
}
