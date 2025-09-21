import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MessageInfoService } from './toastInfo.service';
import { Position } from '../models/position';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);

  public getContrastingTextColor(className: string): string {
    const element = document.getElementsByClassName(`bg-${className}`)[0];
    if (!element) return '#000000';
    
    const backgroundColor = window.getComputedStyle(element).backgroundColor;
    const rgb = backgroundColor.match(/\d+/g) || [];
    
    if (rgb.length < 3) return '#000000';
    
    const r = parseInt(rgb[0]!, 10);
    const g = parseInt(rgb[1], 10);
    const b = parseInt(rgb[2], 10);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  public handleError<T>(errorString: string, errorMessage: any, valueReturn?: T): Observable<T> {
    this.messageInfoService.showError(errorString, errorMessage);
    console.error(errorMessage);
    return of(valueReturn as T);
  }

  public getCustomPosition(index: number): number {
    const mapping: any = { 0: 2, 1: 1, 2: 3 };
    return mapping[index] ?? index + 1;
  }

  public spaceToUnderScore(name: string): string {
    return name.replaceAll(" ", "_");
  }

  public whichPositionIsBetter(position1: Position | null, position2: Position | null): Position {
    const positionNull: Position = new Position(0, 99, 0);
    position1 = position1 ?? positionNull; 
    position2 = position2 ?? positionNull;

    return position1.positionNumber < position2.positionNumber ? position1 : position2;
  }

  public sumPoints(position1: Position | null, position2: Position | null) {
    const pointsFirst: number = position1 != null ? position1.points : 0;
    const pointsSecond: number = position2 != null ? position2.points : 0;
    return pointsFirst + pointsSecond;
  }

  public isNegative(n: number): boolean {
    return n < 0;
  }
}
