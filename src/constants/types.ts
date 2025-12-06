export interface TokenInfo {
  address: string;
  creator: string;
  name: string;
  symbol: string;
  timestamp: number;
}

export enum TokenStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED'
}