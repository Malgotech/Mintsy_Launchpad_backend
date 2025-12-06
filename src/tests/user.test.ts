import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('User API', () => {
  let userId: number;

  beforeAll(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a new user', async () => {
    const res = await request(app)
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
    const res = await request(app).get('/api/v1/users');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBe(1);
  });

  it('should get a user by id', async () => {
    const res = await request(app).get(`/api/v1/users/${userId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', userId);
  });

  it('should update a user', async () => {
    const res = await request(app)
      .put(`/api/v1/users/${userId}`)
      .send({
        name: 'Updated Test User',
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('name', 'Updated Test User');
  });

  it('should delete a user', async () => {
    const res = await request(app).delete(`/api/v1/users/${userId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'User deleted');
  });
});
