import { TokenInfo } from '../constants/types';

const tokens: TokenInfo[] = [];

export async function saveToken(token: TokenInfo) {
  tokens.unshift(token);
  if (tokens.length > 100) tokens.pop();
}

export function getTokens(limit = 10): TokenInfo[] {
  return tokens.slice(0, limit);
}
