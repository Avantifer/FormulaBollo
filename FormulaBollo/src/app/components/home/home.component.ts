import { Component, inject } from '@angular/core';
import { HomeDriversComponent } from "./home-drivers/home-drivers.component";
import { HomeTeamsComponent } from "./home-teams/home-teams.component";
import { NgOptimizedImage } from '@angular/common';
import { ImageService } from '../../../shared/services/image.service';
import { HomeConfigurationComponent } from "./home-configuration/home-configuration.component";

@Component({
  selector: 'app-home',
  imports: [
    NgOptimizedImage,
    HomeDriversComponent,
    HomeTeamsComponent,
    HomeConfigurationComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  protected readonly imageService: ImageService = inject(ImageService);

}
