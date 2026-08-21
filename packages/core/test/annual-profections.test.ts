import { describe, it, expect } from 'vitest';
import { calculateAnnualProfection } from '../src/annual-profections';

describe('calculateAnnualProfection', () => {
  it('activates the 1st house (the Ascendant sign itself) at age 0', () => {
    const birth = new Date(Date.UTC(1990, 5, 15));
    const target = new Date(Date.UTC(1990, 11, 1)); // same year, before first birthday
    const result = calculateAnnualProfection(birth, target, 135); // ASC = 15° Leo

    expect(result.age).toBe(0);
    expect(result.house).toBe(1);
    expect(result.sign).toBe('leo');
    expect(result.timeLord).toBe('sun');
  });

  it('activates the 2nd house at age 1, counting forward from the Ascendant sign', () => {
    const birth = new Date(Date.UTC(1990, 5, 15));
    const target = new Date(Date.UTC(1991, 5, 20)); // just past the first birthday
    const result = calculateAnnualProfection(birth, target, 135); // ASC = Leo

    expect(result.age).toBe(1);
    expect(result.house).toBe(2);
    expect(result.sign).toBe('virgo');
    expect(result.timeLord).toBe('mercury');
  });

  it('does not count the birthday year until the anniversary date is reached', () => {
    const birth = new Date(Date.UTC(1990, 5, 15));
    const beforeAnniversary = new Date(Date.UTC(1991, 5, 14));
    const onAnniversary = new Date(Date.UTC(1991, 5, 15));

    expect(calculateAnnualProfection(birth, beforeAnniversary, 0).age).toBe(0);
    expect(calculateAnnualProfection(birth, onAnniversary, 0).age).toBe(1);
  });

  it('wraps the 12-sign cycle back to the 1st house every 12 years', () => {
    const birth = new Date(Date.UTC(1990, 5, 15));
    const target = new Date(Date.UTC(2002, 5, 20)); // age 12
    const result = calculateAnnualProfection(birth, target, 135); // ASC = Leo

    expect(result.age).toBe(12);
    expect(result.house).toBe(1);
    expect(result.sign).toBe('leo');
    expect(result.timeLord).toBe('sun');
  });

  it('counts houses from whatever sign the Ascendant occupies, not always Aries', () => {
    const birth = new Date(Date.UTC(1985, 0, 1));
    const target = new Date(Date.UTC(1990, 0, 5)); // age 5
    const result = calculateAnnualProfection(birth, target, 200); // ASC = 20° Libra

    // Age 5 -> house 6, counted forward from Libra: Libra(1) Scorpio(2) ... Pisces(6)
    expect(result.house).toBe(6);
    expect(result.sign).toBe('pisces');
    expect(result.timeLord).toBe('jupiter');
  });
});
