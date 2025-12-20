"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../index"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
describe('Trade API', () => {
    let token;
    let user;
    let market;
    beforeAll(async () => {
        await prisma.trade.deleteMany();
        await prisma.market.deleteMany();
        await prisma.liquidityPool.deleteMany();
        await prisma.token.deleteMany();
        await prisma.user.deleteMany();
        user = await prisma.user.create({
            data: {
                userAccount: 'testuser_trade',
                name: 'Test User Trade',
            },
        });
        token = await prisma.token.create({
            data: {
                mintAccount: 'test_mint_account_trade',
                symbol: 'TST_TRADE',
                name: 'Test Token Trade',
                description: 'This is a test token for trade',
                imageUrl: 'http://example.com/image.png',
                creatorAccount: user.userAccount,
            },
        });
        market = await prisma.market.create({
            data: {
                tokenId: token.id,
            }
        });
    });
    afterAll(async () => {
        await prisma.$disconnect();
    });
    it('should place a new order', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/v1/trade')
            .send({
            coinId: token.mintAccount,
            type: 'buy',
            amount: '0.1',
            currency: 'SOL',
            slippage: 20,
            speed: 'fast',
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toHaveProperty('orderId');
    });
    it('should get trade history', async () => {
        const res = await (0, supertest_1.default)(index_1.default).get(`/api/v1/trade?coinId=${token.symbol}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toHaveProperty('trades');
    });
});
