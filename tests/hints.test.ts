import { describe, expect, it } from 'vitest';
import { availableHintPowerups, earnedHintPowerups, HINT_UNLOCK_MS, MAX_HINT_POWERUPS } from '../shared/hints';

const MINUTE_MS = 60_000;

describe('concessão de power-up de dica por tempo (HINT-01, HINT-03)', () => {
  it('não concede nada antes dos 30 minutos', () => {
    expect(earnedHintPowerups(0)).toBe(0);
    expect(earnedHintPowerups(29 * MINUTE_MS)).toBe(0);
    expect(earnedHintPowerups(30 * MINUTE_MS - 1)).toBe(0);
  });

  it('concede o primeiro power-up nos 30 minutos cravados', () => {
    expect(earnedHintPowerups(30 * MINUTE_MS)).toBe(1);
  });

  it('concede o segundo aos 40 minutos e o terceiro aos 50', () => {
    expect(earnedHintPowerups(40 * MINUTE_MS)).toBe(2);
    expect(earnedHintPowerups(50 * MINUTE_MS)).toBe(3);
  });

  it('mantém a concessão do marco anterior no intervalo entre marcos', () => {
    expect(earnedHintPowerups(39 * MINUTE_MS)).toBe(1);
    expect(earnedHintPowerups(49 * MINUTE_MS)).toBe(2);
  });

  it('nunca passa de 3, por maior que seja o tempo decorrido', () => {
    expect(earnedHintPowerups(120 * MINUTE_MS)).toBe(MAX_HINT_POWERUPS);
    expect(earnedHintPowerups(24 * 60 * MINUTE_MS)).toBe(MAX_HINT_POWERUPS);
    expect(HINT_UNLOCK_MS).toHaveLength(MAX_HINT_POWERUPS);
  });
});

describe('disponível é o ganho menos o usado (HINT-23)', () => {
  it('desconta os power-ups já gastos', () => {
    expect(availableHintPowerups(50 * MINUTE_MS, 0)).toBe(3);
    expect(availableHintPowerups(50 * MINUTE_MS, 2)).toBe(1);
    expect(availableHintPowerups(30 * MINUTE_MS, 1)).toBe(0);
  });

  it('nunca devolve valor negativo', () => {
    expect(availableHintPowerups(0, 1)).toBe(0);
    expect(availableHintPowerups(30 * MINUTE_MS, 3)).toBe(0);
  });
});
