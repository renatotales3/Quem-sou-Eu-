import { describe, expect, it } from 'vitest';
import { pointsForRank } from '../server/scoring';
import { MAX_PLAYERS, MIN_PLAYERS } from '../server/game';

describe('pointsForRank (SCORE-01)', () => {
  it('numa sala de 5, o primeiro leva 5 e o último a acertar leva 1', () => {
    expect(pointsForRank(1, 5)).toBe(5);
    expect(pointsForRank(5, 5)).toBe(1);
  });

  it('numa sala no mínimo de jogadores, o primeiro leva 2 e o segundo leva 1', () => {
    expect(pointsForRank(1, 2)).toBe(2);
    expect(pointsForRank(2, 2)).toBe(1);
  });

  it('o último colocado recebe exatamente 1, nunca 0, para N de 2 a 12', () => {
    for (let playerCount = MIN_PLAYERS; playerCount <= MAX_PLAYERS; playerCount += 1) {
      expect(pointsForRank(playerCount, playerCount)).toBe(1);
    }
  });

  it('a vantagem do primeiro escala com o tamanho da sala: ele leva sempre N', () => {
    for (let playerCount = MIN_PLAYERS; playerCount <= MAX_PLAYERS; playerCount += 1) {
      expect(pointsForRank(1, playerCount)).toBe(playerCount);
    }
  });

  it('a soma dos pontos de uma rodada com N jogadores todos acertando é N * (N + 1) / 2', () => {
    for (let playerCount = MIN_PLAYERS; playerCount <= MAX_PLAYERS; playerCount += 1) {
      let total = 0;
      for (let rank = 1; rank <= playerCount; rank += 1) {
        total += pointsForRank(rank, playerCount);
      }
      expect(total).toBe((playerCount * (playerCount + 1)) / 2);
    }
  });
});
