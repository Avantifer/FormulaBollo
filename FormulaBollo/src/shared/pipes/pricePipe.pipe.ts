import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "pricePipe",
})
export class PricePipe implements PipeTransform {

  transform(value: number): string {
    if (value == null) return '';
    const isNegative = value < 0;
    const abs = Math.abs(value);

    if (abs >= 1_000_000) {
      const millones = abs / 1_000_000;
      const clean = Number(millones.toFixed(2)).toString();
      return (isNegative ? '-' : '') + clean + 'M';
    }

    return (isNegative ? '-' : '') + abs.toString();
  }
}
