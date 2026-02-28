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
});
