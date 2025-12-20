"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../index"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
describe('Token API', () => {
    let token;
    let user;
    beforeAll(async () => {
        await prisma.trade.deleteMany();
        await prisma.market.deleteMany();
        await prisma.socialLink.deleteMany();
        await prisma.watchlist.deleteMany();
        await prisma.liquidityPool.deleteMany();
        await prisma.bondingCurve.deleteMany();
        await prisma.token.deleteMany();
        await prisma.user.deleteMany();
        user = await prisma.user.create({
            data: {
                userAccount: 'testuser_token',
                name: 'Test User Token',
            },
        });
    });
    afterAll(async () => {
        await prisma.$disconnect();
    });
    it('should create a new token', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/v1/coins')
            .send({
            mintAccount: 'test_mint_account',
            symbol: 'TST',
            name: 'Test Token',
            description: 'This is a test token',
            imageUrl: 'http://example.com/image.png',
            user_account: user.userAccount,
        });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        token = res.body;
    });
    it('should get all tokens', async () => {
        const res = await (0, supertest_1.default)(index_1.default).get('/api/v1/coins');
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(1);
    });
    it('should get a token by id', async () => {
        const res = await (0, supertest_1.default)(index_1.default).get(`/api/v1/coins/${token.id}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('id', token.id);
    });
    it('should get a token by symbol', async () => {
        const res = await (0, supertest_1.default)(index_1.default).get(`/api/v1/coins/details/${token.symbol}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toHaveProperty('symbol', token.symbol);
    });
    it('should update a token', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .put(`/api/v1/coins/${token.id}`)
            .send({
            name: 'Updated Test Token',
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toHaveProperty('name', 'Updated Test Token');
    });
    it('should get token holders', async () => {
        const market = await prisma.market.findUnique({
            where: {
                tokenId: token.id,
            },
        });
        if (!market) {
            throw new Error('Market not found');
        }
        const trade = await prisma.trade.create({
            data: {
                userId: user.id,
                tokenId: token.id,
                marketId: market.id,
                amount: 100,
                price: 1,
                side: 'BUY',
                txHash: 'test_tx_hash'
            }
        });
        const res = await (0, supertest_1.default)(index_1.default).get(`/api/v1/coins/${token.id}/holders`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0]).toHaveProperty('id', user.id);
    });
});
