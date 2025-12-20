"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../index"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
describe('User API', () => {
    let userId;
    beforeAll(async () => {
        await prisma.user.deleteMany();
    });
    afterAll(async () => {
        await prisma.$disconnect();
    });
    it('should create a new user', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/v1/users')
            .send({
            userAccount: 'testuser',
            name: 'Test User',
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('id');
        userId = res.body.id;
    });
    it('should get all users', async () => {
        const res = await (0, supertest_1.default)(index_1.default).get('/api/v1/users');
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(1);
    });
    it('should get a user by id', async () => {
        const res = await (0, supertest_1.default)(index_1.default).get(`/api/v1/users/${userId}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('id', userId);
    });
    it('should update a user', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .put(`/api/v1/users/${userId}`)
            .send({
            name: 'Updated Test User',
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('name', 'Updated Test User');
    });
    it('should delete a user', async () => {
        const res = await (0, supertest_1.default)(index_1.default).delete(`/api/v1/users/${userId}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'User deleted');
    });
});
