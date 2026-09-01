import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page on start', () => {
  render(<App />);
  const linkElement = screen.getByText(/ENTER SYSTEM/i);
  expect(linkElement).toBeInTheDocument();
});
