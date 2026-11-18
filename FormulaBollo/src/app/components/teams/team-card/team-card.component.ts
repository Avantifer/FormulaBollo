import { AfterViewChecked, ChangeDetectionStrategy, Component, ElementRef, inject, Input, QueryList, ViewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-team-card',
  imports: [
    RouterLink,
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
export class TeamCardComponent implements AfterViewChecked {
  protected imageService: ImageService = inject(ImageService);
  protected utilsService: UtilsService = inject(UtilsService);

  @Input() teamPoints!: TeamWithDrivers;
  @Input() index!: number;

  @ViewChildren(ProgressBar, { read: ElementRef }) private progressBars!: QueryList<ElementRef<HTMLElement>>;

  ngAfterViewChecked(): void {
    // PrimeNG reapplies its invalid aria-level host binding when the value changes.
    this.progressBars.forEach(bar => bar.nativeElement.removeAttribute('aria-level'));
  }

  protected teamNameSpaceToUnderScore(teamName: string) {
    return teamName.replaceAll(" ", "_");
  }

  protected progressPercentage(driverPoint: number): number {
    const maxValue: number = this.teamPoints.driver1.totalPoints + this.teamPoints.driver2.totalPoints;
    return (driverPoint / maxValue) * 100;
  }
}
