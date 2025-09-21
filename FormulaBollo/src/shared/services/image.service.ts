import { Injectable } from '@angular/core';
import { environment } from '../../enviroments/enviroment';

@Injectable({
  providedIn: 'root'
})
export class ImageService {

  public getImageUrl(imagePath: string): string { 
    return `${environment.apiUrl}/${imagePath}`;
  }
}