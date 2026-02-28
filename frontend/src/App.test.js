import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock fetch to return minimal but valid data
beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/categories')) {
      return Promise.resolve({ json: () => Promise.resolve({ categories: [] }) });
    }
    if (url.includes('/api/products')) {
      return Promise.resolve({ json: () => Promise.resolve({ products: [] }) });
    }
    if (url.includes('/api/listings')) {
      return Promise.resolve({ json: () => Promise.resolve({ listings: [] }) });
    }
    if (url.includes('/api/stats/marketplace')) {
      return Promise.resolve({ json: () => Promise.resolve({ stats: { total_users: 0, total_listings: 0, total_orders: 0 } }) });
    }
    if (url.includes('/api/promotions/ticket')) {
      return Promise.resolve({ json: () => Promise.resolve({ show: false }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('renders FarmPro Marketplace heading', () => {
  render(<App />);
  const heading = screen.getByText(/FarmPro Marketplace v2.0/i);
  expect(heading).toBeInTheDocument();
});

test('renders Browse button in navigation', () => {
  render(<App />);
  const browseButton = screen.getByRole('button', { name: /Browse/i });
  expect(browseButton).toBeInTheDocument();
});

test('renders Register/Login button initially', () => {
  render(<App />);
  const registerButton = screen.getByRole('button', { name: /Register \/ Login/i });
  expect(registerButton).toBeInTheDocument();
});