import { PricePipe } from './pricePipe.pipe';

describe('PricePipe Spanish decimals', () => {
  const pipe = new PricePipe();

  for (const [value, expected] of [
    [1234567, '1,23M'], [-1234567, '-1,23M'], [1200000, '1,2M'],
    [1000000, '1M'], [12.345, '12,345'], [-0.5, '-0,5'], [12345, '12345'], [0, '0']
  ] as const) {
    it(`formats ${value} as ${expected}`, () => expect(pipe.transform(value)).toBe(expected));
  }
});
