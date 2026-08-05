import { describe, expect, it } from 'vitest';
import { parseAllowedOrigins } from '../server/origins';

function allows(value: string | undefined, origin: string): boolean {
  const parsed = parseAllowedOrigins(value);
  if (parsed === true) return true;
  return parsed.some((entry) => (typeof entry === 'string' ? entry === origin : entry.test(origin)));
}

describe('parseAllowedOrigins', () => {
  it('sem configuração, reflete qualquer origem (modo desenvolvimento)', () => {
    expect(parseAllowedOrigins(undefined)).toBe(true);
    expect(parseAllowedOrigins('')).toBe(true);
    expect(parseAllowedOrigins('   ')).toBe(true);
    expect(parseAllowedOrigins(',,')).toBe(true);
  });

  it('aceita uma origem só', () => {
    expect(parseAllowedOrigins('https://jogo.vercel.app')).toEqual(['https://jogo.vercel.app']);
    expect(allows('https://jogo.vercel.app', 'https://jogo.vercel.app')).toBe(true);
    expect(allows('https://jogo.vercel.app', 'https://outro.vercel.app')).toBe(false);
  });

  it('aceita lista separada por vírgula, com espaços', () => {
    expect(parseAllowedOrigins('https://a.app, https://b.app')).toEqual(['https://a.app', 'https://b.app']);
    expect(allows('https://a.app, https://b.app', 'https://b.app')).toBe(true);
  });

  it('remove barra final, que o CORS não perdoaria', () => {
    expect(parseAllowedOrigins('https://jogo.vercel.app/')).toEqual(['https://jogo.vercel.app']);
    expect(allows('https://jogo.vercel.app/', 'https://jogo.vercel.app')).toBe(true);
  });

  it('curinga cobre os preview deploys da Vercel', () => {
    const pattern = 'https://*.vercel.app';
    expect(allows(pattern, 'https://quem-sou-eu-git-main-renato.vercel.app')).toBe(true);
    expect(allows(pattern, 'https://outro-preview.vercel.app')).toBe(true);
  });

  it('curinga casa um único rótulo e não vaza para domínio de terceiro', () => {
    const pattern = 'https://*.vercel.app';
    // Um `.*` ingênuo aceitaria estes dois; `[^.]*` recusa.
    expect(allows(pattern, 'https://a.b.vercel.app')).toBe(false);
    expect(allows(pattern, 'https://jogo.vercel.app.invasor.com')).toBe(false);
    // E o ponto do domínio é literal, não um curinga de regex.
    expect(allows(pattern, 'https://jogo.vercelXapp')).toBe(false);
  });

  it('combina origem fixa e curinga na mesma lista', () => {
    const value = 'https://jogo.com.br, https://*.vercel.app';
    expect(allows(value, 'https://jogo.com.br')).toBe(true);
    expect(allows(value, 'https://preview-42.vercel.app')).toBe(true);
    expect(allows(value, 'https://invasor.com')).toBe(false);
  });
});
