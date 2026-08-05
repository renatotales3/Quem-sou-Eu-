/**
 * Origens permitidas pelo CORS do Socket.IO.
 *
 * Num deploy dividido (interface na Vercel, servidor na Railway) uma origem
 * só não basta: a Vercel publica a URL de produção e uma URL nova por preview
 * deploy, com subdomínio gerado. Por isso `PUBLIC_ORIGIN` aceita uma lista
 * separada por vírgula e entradas com `*` num rótulo de subdomínio.
 */
export function parseAllowedOrigins(value: string | undefined): Array<string | RegExp> | true {
  const entries = (value ?? '')
    .split(',')
    // Barra final é o erro de digitação mais comum ao colar a URL do painel, e
    // o CORS compara a origem exata — "https://x.app/" nunca casaria.
    .map((entry) => entry.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  // Sem configuração, reflete qualquer origem: é o comportamento de
  // desenvolvimento, em que a interface vem do Vite em outra porta.
  if (entries.length === 0) return true;

  return entries.map((entry) => (entry.includes('*') ? wildcardToRegExp(entry) : entry));
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // `[^.]*` casa um único rótulo: "https://*.vercel.app" aceita
    // "https://preview-abc.vercel.app" e recusa "https://a.b.vercel.app".
    .replace(/\\\*/g, '[^.]*');
  return new RegExp(`^${escaped}$`);
}
