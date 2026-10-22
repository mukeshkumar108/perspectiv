import { advance, goBack, initialOrder, shuffle } from '../src/components/deckOrder';

describe('moment deck order', () => {
  it('sends the front card to the back and brings the next forward', () => {
    expect(advance([0, 1, 2, 3])).toEqual([1, 2, 3, 0]);
  });

  it('goes back one card, and a full lap returns to the start', () => {
    expect(goBack([1, 2, 3, 0])).toEqual([0, 1, 2, 3]);
    let order = initialOrder(4);
    for (let i = 0; i < 4; i += 1) order = advance(order);
    expect(order).toEqual([0, 1, 2, 3]);
  });

  it('leaves a deck of one or none alone', () => {
    expect(advance([0])).toEqual([0]);
    expect(shuffle([])).toEqual([]);
    expect(shuffle([0])).toEqual([0]);
  });

  it('always puts a different card in front, and keeps every card', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      let x = seed;
      const rng = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
      const out = shuffle([0, 1, 2, 3, 4], rng);
      expect(out[0]).not.toBe(0);
      expect([...out].sort()).toEqual([0, 1, 2, 3, 4]);
    }
  });
});
