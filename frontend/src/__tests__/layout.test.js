import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

const auth = { currentUser: { first_name: 'Priya', last_name: 'Nair', username: 'priya.nair', role: 'Admin', employee_id: 'e1', email: 'p@x.com' }, logout: vi.fn(), hasRole: () => true, isAuthenticated: true };
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../contexts/ThemeContext', () => ({ useColorMode: () => ({ mode: 'light', toggleColorMode: vi.fn() }) }));
vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({ notifications: [], unreadCount: 0, error: null, markAsRead: vi.fn(), markAllAsRead: vi.fn(), deleteNotification: vi.fn(), fetchNotifications: vi.fn() }),
}));
vi.mock('../services/api', () => ({ __esModule: true, default: { get: vi.fn(), post: vi.fn(), put: vi.fn() }, createApiClient: () => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }), OFFLINE_EVENT: 'offline', ONLINE_EVENT: 'online' }));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const renderAt = (ui) => render(<MemoryRouter initialEntries={['/']}><Routes><Route path="*" element={<>{ui}<Where /></>} /></Routes></MemoryRouter>);

test('the account menu opens the profile and settings and logs out', () => {
  renderAt(<Header sidebarOpen toggleSidebar={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /account settings/i }));
  fireEvent.click(screen.getByText('My Profile'));
  expect(screen.getByTestId('where')).toHaveTextContent('/employees/e1');
  fireEvent.click(screen.getByRole('button', { name: /account settings/i }));
  fireEvent.click(screen.getByText('Settings'));
  expect(screen.getByTestId('where')).toHaveTextContent('/settings');
  fireEvent.click(screen.getByRole('button', { name: /account settings/i }));
  fireEvent.click(screen.getByText('Logout'));
  expect(auth.logout).toHaveBeenCalled();
  expect(screen.getByTestId('where')).toHaveTextContent('/login');
});

test('the top bar has the notification bell and searches', () => {
  renderAt(<Header sidebarOpen toggleSidebar={() => {}} />);
  expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
});

test('the sidebar has no AI Assistant entry but keeps the rest', () => {
  renderAt(<Sidebar open />);
  expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument();
  ['Dashboard', 'Employee Directory', 'Payroll', 'Analytics', 'Recognition', 'Exit Management'].forEach((name) => expect(screen.getByText(name)).toBeInTheDocument());
  fireEvent.click(screen.getByText('HR Tools'));
  expect(screen.getByText('Recruitment')).toBeInTheDocument();
});
