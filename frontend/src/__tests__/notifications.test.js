import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

import NotificationsPage from '../pages/NotificationsPage';
import NotificationMenu from '../components/notifications/NotificationMenu';

const ctx = {};
vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ctx }));

const note = (id, title, over = {}) => ({ _id: id, title, message: `${title} message`, read: false, type: 'leave_update', category: 'Leave', link: '/leaves', created_at: new Date().toISOString(), ...over });
const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

beforeEach(() => {
  Object.assign(ctx, {
    notifications: [note('1', 'Leave approved'), note('2', 'Payslip ready', { category: 'Payroll', link: '/payroll', read: true }), note('3', 'Welcome', { category: 'System', link: null })],
    unreadCount: 2, error: null, hasMore: false, loading: false, incoming: [],
    markAsRead: vi.fn(), markAllAsRead: vi.fn(), deleteNotification: vi.fn(), clearRead: vi.fn(), loadMore: vi.fn(), fetchNotifications: vi.fn(), dismissIncoming: vi.fn(),
  });
});

test('the bell shows the unread count and opens the latest notifications with links', () => {
  render(<MemoryRouter><NotificationMenu /><Where /></MemoryRouter>);
  const bell = screen.getByRole('button', { name: /notifications, 2 unread/i });
  fireEvent.click(bell);
  expect(ctx.fetchNotifications).toHaveBeenCalled();                                  // the list is refreshed whenever the menu opens
  const menu = screen.getByRole('menu');
  expect(within(menu).getByText('Leave approved')).toBeInTheDocument();
  fireEvent.click(within(menu).getByText('Leave approved'));
  expect(ctx.markAsRead).toHaveBeenCalledWith('1');
  expect(screen.getByTestId('where')).toHaveTextContent('/leaves');
});

test('the bell lets you remove one, mark all read and go to the full page', () => {
  render(<MemoryRouter><Routes><Route path="*" element={<><NotificationMenu /><Where /></>} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove notification: Welcome' }));
  expect(ctx.deleteNotification).toHaveBeenCalledWith('3');
  fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));
  expect(ctx.markAllAsRead).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /see all notifications/i }));
  expect(screen.getByTestId('where')).toHaveTextContent('/notifications');
});

test('an empty bell says you are all caught up', () => {
  Object.assign(ctx, { notifications: [], unreadCount: 0 });
  render(<MemoryRouter><NotificationMenu /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  expect(screen.getByText('You are all caught up')).toBeInTheDocument();
});

test('the notifications page filters by unread and category, opens items and clears read ones', () => {
  render(<MemoryRouter><NotificationsPage /><Where /></MemoryRouter>);
  expect(screen.getByText('Leave approved')).toBeInTheDocument();
  expect(screen.getByText('Payslip ready')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /unread \(2\)/i }));
  expect(screen.queryByText('Payslip ready')).not.toBeInTheDocument();                  // it has been read
  fireEvent.click(screen.getByRole('tab', { name: /all \(3\)/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Payroll' }));
  expect(screen.queryByText('Leave approved')).not.toBeInTheDocument();
  expect(screen.getByText('Payslip ready')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Payslip ready'));
  expect(screen.getByTestId('where')).toHaveTextContent('/payroll');
  fireEvent.click(screen.getByRole('button', { name: /clear read/i }));
  expect(ctx.clearRead).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }));
  expect(ctx.markAllAsRead).toHaveBeenCalled();
});

test('the notifications page offers older ones and shows errors with a retry', () => {
  Object.assign(ctx, { hasMore: true, error: 'Could not load your notifications.' });
  render(<MemoryRouter><NotificationsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /load older notifications/i }));
  expect(ctx.loadMore).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));
  expect(ctx.fetchNotifications).toHaveBeenCalled();
});
