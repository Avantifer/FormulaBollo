import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'skeletonItems'
})
export class SkeletonItemsPipe implements PipeTransform {

  transform(count: number): number[] {
    return Array.from({ length: count });
  }
}