import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// simple fetch mock that returns minimal data so App can mount
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ categories: [], products: [], listings: [], stats: {} }),
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders the main heading', () => {
  render(<App />);
  const heading = screen.getByText(/FarmPro Marketplace v2.0/i);
  expect(heading).toBeInTheDocument();
});

// verify registration form shows when clicking register button
test('shows registration form when register button is clicked', async () => {
  render(<App />);
  const registerButton = screen.getByRole('button', { name: /register \/ login/i });
  fireEvent.click(registerButton);
  const emailLabel = await screen.findByLabelText(/Email:/i);
  expect(emailLabel).toBeInTheDocument();
});

// ensure promo modal can be closed when clicking outside
test('promo modal is dismissible', async () => {
  // override fetch to return a promo
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/promotions/ticket')) {
      return Promise.resolve({ json: () => Promise.resolve({ show: true, title: 'Hi', message: 'Test', link: '#' }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ categories: [], products: [], listings: [], stats: {} }) });
  });
  render(<App />);
  // wait for modal to appear
  const promoTitle = await screen.findByText('Hi');
  expect(promoTitle).toBeInTheDocument();
  // click background
  fireEvent.click(screen.getByText('Hi').parentElement.parentElement);
  await waitFor(() => {
    expect(screen.queryByText('Hi')).not.toBeInTheDocument();
  });
});