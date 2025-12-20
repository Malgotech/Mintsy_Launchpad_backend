"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../utils/helpers");
describe('Chart Candle Generation', () => {
    const mockToken = {
        mintAccount: 'test_mint_123',
        market: {
            marketCap: 1000000
        }
    };
    const mockTrades = [
        {
            id: 1,
            createdAt: new Date('2024-01-01T10:00:00Z'),
            marketCap: 1000000,
            tokenAmount: 1000,
            amount: 1000,
            token: { mintAccount: 'test_mint_123' }
        },
        {
            id: 2,
            createdAt: new Date('2024-01-01T10:30:00Z'),
            marketCap: 1500000,
            tokenAmount: 1500,
            amount: 1500,
            token: { mintAccount: 'test_mint_123' }
        },
        {
            id: 3,
            createdAt: new Date('2024-01-01T11:00:00Z'),
            marketCap: 1200000,
            tokenAmount: 1200,
            amount: 1200,
            token: { mintAccount: 'test_mint_123' }
        }
    ];
    describe('createBaselineCandle', () => {
        it('should create a baseline candle starting from 0', () => {
            const startTime = new Date('2024-01-01T00:00:00Z');
            const candle = (0, helpers_1.createBaselineCandle)(mockToken, startTime, '1h');
            expect(candle.open).toBe(0);
            expect(candle.low).toBe(0);
            expect(candle.high).toBe(1000000);
            expect(candle.close).toBe(1000000);
            expect(candle.volume).toBe(0);
        });
        it('should handle tokens with no market cap', () => {
            const tokenNoMarket = { ...mockToken, market: { marketCap: null } };
            const startTime = new Date('2024-01-01T00:00:00Z');
            const candle = (0, helpers_1.createBaselineCandle)(tokenNoMarket, startTime, '1h');
            expect(candle.open).toBe(0);
            expect(candle.low).toBe(0);
            expect(candle.high).toBe(0);
            expect(candle.close).toBe(0);
        });
    });
    describe('calculateMarketCapFromTrade', () => {
        it('should use marketCap when available', () => {
            const trade = { marketCap: 1000000 };
            const result = (0, helpers_1.calculateMarketCapFromTrade)(trade);
            expect(result).toBe(1000000);
        });
        it('should calculate from price and amount when marketCap not available', () => {
            const trade = { price: 100, amount: 1000 };
            const result = (0, helpers_1.calculateMarketCapFromTrade)(trade);
            expect(result).toBe(100000);
        });
        it('should handle negative marketCap', () => {
            const trade = { marketCap: -1000000 };
            const result = (0, helpers_1.calculateMarketCapFromTrade)(trade);
            expect(result).toBe(1000000);
        });
        it('should return 0 for invalid data', () => {
            const trade = { price: 'invalid', amount: 'invalid' };
            const result = (0, helpers_1.calculateMarketCapFromTrade)(trade);
            expect(result).toBe(0);
        });
    });
    describe('generateOHLCVCandles', () => {
        it('should generate candles with first candle starting from 0', () => {
            const startTime = new Date('2024-01-01T00:00:00Z');
            const candles = (0, helpers_1.generateOHLCVCandles)(mockTrades, '1h', startTime);
            expect(candles.length).toBeGreaterThan(0);
            // First candle should start from 0
            const firstCandle = candles[0];
            expect(firstCandle.open).toBe(0);
            expect(firstCandle.low).toBe(0);
            expect(firstCandle.high).toBe(1000000);
            expect(firstCandle.close).toBe(1000000);
        });
        it('should handle empty trades array', () => {
            const startTime = new Date('2024-01-01T00:00:00Z');
            const candles = (0, helpers_1.generateOHLCVCandles)([], '1h', startTime);
            expect(candles).toEqual([]);
        });
        it('should handle trades with missing marketCap', () => {
            const tradesWithMissingMC = [
                {
                    id: 1,
                    createdAt: new Date('2024-01-01T10:00:00Z'),
                    price: 100,
                    amount: 1000,
                    token: { mintAccount: 'test_mint_123' }
                }
            ];
            const startTime = new Date('2024-01-01T00:00:00Z');
            const candles = (0, helpers_1.generateOHLCVCandles)(tradesWithMissingMC, '1h', startTime);
            expect(candles.length).toBeGreaterThan(0);
            expect(candles[0].close).toBe(100000); // price * amount
        });
    });
});
