import { describe, expect, it } from 'vitest';
import { formatDuration } from '../shared/time';

describe('formatDuration', () => {
  it('formata 0 ms como 00:00', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('formata 1 segundo como 00:01', () => {
    expect(formatDuration(1_000)).toBe('00:01');
  });

  it('formata 59 segundos como 00:59', () => {
    expect(formatDuration(59_000)).toBe('00:59');
  });

  it('formata 60 segundos como 01:00', () => {
    expect(formatDuration(60_000)).toBe('01:00');
  });

  it('formata 3.599.999 ms (abaixo de 1h) como mm:ss', () => {
    expect(formatDuration(3_599_999)).toBe('59:59');
  });

  it('formata 3.600.000 ms (exatamente 1h) como h:mm:ss', () => {
    expect(formatDuration(3_600_000)).toBe('1:00:00');
  });

  it('trata negativo como 00:00', () => {
    expect(formatDuration(-1)).toBe('00:00');
  });

  it('trata NaN como 00:00', () => {
    expect(formatDuration(Number.NaN)).toBe('00:00');
  });

  it('trata Infinity como 00:00', () => {
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('00:00');
  });
});
