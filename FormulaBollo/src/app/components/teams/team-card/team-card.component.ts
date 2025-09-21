import { Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ImageService } from '../../../../shared/services/image.service';
import { SpaceToUnderscorePipe } from "../../../../shared/pipes/spaceToUnderscore.pipe";
import { ChipModule } from 'primeng/chip';
import { CommonModule } from '@angular/common';
import { ProgressBar } from 'primeng/progressbar';
import { UtilsService } from '../../../../shared/services/utils.service';
import { TeamWithDrivers } from '../../../../shared/models/teamWithDrivers';
import { Divider } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-team-card',
  imports: [
    CommonModule,
    ChipModule,
    SkeletonModule,
    Divider,
    ProgressBar,
    SpaceToUnderscorePipe
  ],
  templateUrl: './team-card.component.html',
  styleUrl: './team-card.component.scss'
})
export class TeamCardComponent {
  protected router: Router = inject(Router);
  protected imageService: ImageService = inject(ImageService);
  protected utilsService: UtilsService = inject(UtilsService);

  @Input() teamPoints!: TeamWithDrivers;
  @Input() index!: number;

  protected teamNameSpaceToUnderScore(teamName: string) {
    return teamName.replaceAll(" ", "_");
  }

  protected progressPercentage(driverPoint: number): number {
    const maxValue: number = this.teamPoints.driver1.totalPoints + this.teamPoints.driver2.totalPoints;
    return (driverPoint / maxValue) * 100;
  }
}
