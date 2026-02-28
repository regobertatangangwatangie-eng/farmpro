const request = require('supertest');
const express = require('express');
const db = require('../db');

// import the server app by requiring server.js directly
let app;

beforeAll(() => {
  jest.resetModules();
  app = require('../server');
});

afterAll(() => {
  // close database if necessary
});

describe('Basic API checks', () => {
  test('GET /health returns ok', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('GET /api/info returns service info', async () => {
    const response = await request(app).get('/api/info');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('service');
  });

  test('GET /api/categories returns an array', async () => {
    const response = await request(app).get('/api/categories');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.categories)).toBe(true);
  });

  test('POST /api/users/register creates new user', async () => {
    const email = `testuser${Date.now()}@example.com`;
    const response = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test User',
        email,
        role: 'buyer',
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(email);
  });

  test('GET /api/promotions/ticket returns promotion object', async () => {
    const response = await request(app).get('/api/promotions/ticket');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('show');
  });
});
