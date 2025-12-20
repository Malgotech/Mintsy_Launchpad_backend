"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const __1 = __importDefault(require(".."));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
describe("Market API Flow", () => {
    let marketId;
    let tokenId;
    const testUserAccount = "0xTestUser123";
    const price = "1000000000000000000"; // 1 ETH in wei
    const marketPayload = {
        tokenId: 1, // Will be set after token creation
        currentPrice: price,
        priceChange: "1000",
        volume24h: 1000,
        liquidity: 1000,
    };
    it("should run a dummy test", () => {
        expect(true).toBe(true);
    });
    beforeAll(async () => {
        // Clean up and create test data
        await prisma.market.deleteMany();
        await prisma.token.deleteMany();
        await prisma.user.deleteMany();
        // Create test user
        await prisma.user.create({
            data: {
                userAccount: testUserAccount,
                name: "Test User",
                avatarUrl: "https://example.com/avatar.png",
                bio: "Test bio",
            },
        });
        // Create test token
        const token = await prisma.token.create({
            data: {
                // mintAccount: "0xMiningAccount1235676", // Now optional
                symbol: "TKN",
                name: "Sample Token",
                description: "A sample token for demonstration purposes",
                imageUrl: "https://example.com/token-image.png",
                creatorAccount: testUserAccount, // Use the test user account
                // decimals: 18, // Optional, default is 9
                decimals: 9,
                status: client_1.TokenStatus.PENDING, // Optional, default is PENDING
            },
        });
        tokenId = token.id;
        marketPayload.tokenId = tokenId;
    });
    afterAll(async () => {
        await prisma.token.deleteMany();
        await prisma.user.deleteMany();
        await prisma.market.deleteMany();
        await prisma.$disconnect();
    });
    it("should create a new market listing", async () => {
        const res = await (0, supertest_1.default)(__1.default).post("/api/v1/markets").send(marketPayload);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body.tokenId).toBe(tokenId);
        expect(res.body.price).toBe(price);
        marketId = res.body.id;
    });
});
