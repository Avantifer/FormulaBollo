import { Pipe, type PipeTransform } from "@angular/core";

@Pipe({
  name: "SpaceToUnderscore"
})
export class SpaceToUnderscorePipe implements PipeTransform {
  transform(value: string): string {
    return value.replaceAll(" ", "_");
  }
}