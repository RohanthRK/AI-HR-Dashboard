import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

import api from '../services/api';
import attendanceService from '../services/attendanceService';
import Dashboard from '../pages/Dashboard';

vi.mock('../services/api', () => ({ __esModule: true, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('../services/attendanceService', () => ({ __esModule: true, default: { getStatus: vi.fn(), clockIn: vi.fn(), clockOut: vi.fn() } }));
const USER = { currentUser: { first_name: 'Priya', username: 'priya.nair', role: 'Admin' } };      // one stable object, like the real context
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => USER }));
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return { ...actual, ResponsiveContainer: ({ children }) => <div style={{ width: 400, height: 250 }}>{React.cloneElement(children, { width: 400, height: 250 })}</div> };
});

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const renderDashboard = () => render(<MemoryRouter initialEntries={['/']}><Routes><Route path="*" element={<><Dashboard /><Where /></>} /></Routes></MemoryRouter>);

const FULL = {
  role: 'admin', generated_at: '2026-10-27T05:00:00Z',
  attention: [
    { id: 'compliance-critical', label: 'Critical compliance issues (expired or overdue)', count: 7, link: '/compliance', severity: 'error', hint: '' },
    { id: 'leaves', label: 'Leave requests waiting for your decision', count: 5, link: '/leaves/pending', severity: 'warning', hint: '' },
    { id: 'notifications', label: 'Unread notifications', count: 2, link: null, severity: 'info', hint: '' },
  ],
  kpis: [{ id: 'employees', label: 'Employees', value: 49, hint: '1 joined this month', link: '/employees' }, { id: 'teams', label: 'Teams', value: 12, hint: '8 departments', link: '/teams' }],
  attendance: { title: 'Attendance today', weekend: false, rows: [{ label: 'In', value: 40, tone: 'success' }, { label: 'On leave', value: 3, tone: 'info' }, { label: 'Not in yet', value: 6, tone: 'error' }, { label: 'Late', value: 2, tone: 'warning' }] },
  leave_balance: { entitlements: { 'Earned Leaves': 18 }, used: {}, pending: {}, remaining: { 'Earned Leaves': 15.5, 'Sick Leaves': 10 } },
  holidays: [{ date: '2026-11-09', name: 'Diwali (Govardhan Puja)' }, { date: '2026-12-25', name: 'Christmas Day' }],
  department_distribution: [{ label: 'Engineering', value: 20 }, { label: 'Sales', value: 8 }],
  hires_by_month: [{ month: 'Sep 2026', value: 1 }], out_today: [{ name: 'Maya Singh', leave_type: 'Earned Leaves', until: '2026-10-29' }],
  people: { birthdays: [{ name: 'Tarun Bhatia', date: '2026-10-30', days_away: 3, department: 'Engineering' }], anniversaries: [{ name: 'Raj Patel', date: '2026-11-02', days_away: 6, years: 3, department: 'Finance' }],
            new_joiners: [{ id: 'e9', name: 'Charu Jain', position: 'Support Specialist', department: 'Support', date: '2026-10-20' }] },
  activity: [{ id: 'a1', type: 'application', title: 'New application', description: 'Prakash Menon applied (LinkedIn)', at: new Date().toISOString(), link: '/recruitment' }],
};
const EMPTY = { ...FULL, attention: [], kpis: [{ id: 'employees', label: 'Employees', value: 1, hint: '', link: '/employees' }], attendance: null, leave_balance: null, holidays: [], department_distribution: [], hires_by_month: [],
                out_today: [], people: { birthdays: [], anniversaries: [], new_joiners: [] }, activity: [] };

beforeEach(() => {
  vi.clearAllMocks();
  attendanceService.getStatus.mockResolvedValue({ is_clocked_in: false });
});

test('the dashboard shows real, role-specific data from one call', async () => {
  api.get.mockResolvedValue({ data: FULL });
  renderDashboard();
  expect(await screen.findByText(/Welcome back, Priya!/)).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/api/dashboard/');
  expect(screen.getByText('2 things need your attention today.')).toBeInTheDocument();
  expect(screen.getByText('Critical compliance issues (expired or overdue)')).toBeInTheDocument();
  expect(screen.getByText('Diwali (Govardhan Puja)')).toBeInTheDocument();
  expect(screen.getByText('15.5')).toBeInTheDocument();                             // earned leave left comes from the server, not a default of 18
  expect(screen.getByText(/10 sick days left/)).toBeInTheDocument();
  expect(screen.getByText(/Maya Singh/)).toBeInTheDocument();
  expect(screen.getByText(/Tarun Bhatia/)).toBeInTheDocument();
  expect(screen.getByText(/Raj Patel/)).toBeInTheDocument();
  expect(screen.getByText(/3 years/)).toBeInTheDocument();
  expect(screen.getByText('Prakash Menon applied (LinkedIn)')).toBeInTheDocument();
  expect(screen.getByText('Attendance today')).toBeInTheDocument();
});

test('clicking something that needs attention goes to the right page', async () => {
  api.get.mockResolvedValue({ data: FULL });
  renderDashboard();
  fireEvent.click(await screen.findByText('Leave requests waiting for your decision'));
  expect(screen.getByTestId('where')).toHaveTextContent('/leaves/pending');
});

test('an empty company shows honest empty states and no invented activity', async () => {
  api.get.mockResolvedValue({ data: EMPTY });
  renderDashboard();
  expect(await screen.findByText('You are all caught up. Nothing is waiting for you.')).toBeInTheDocument();
  expect(screen.getByText('Nothing is waiting for you right now.')).toBeInTheDocument();
  expect(screen.getByText('No holidays are scheduled. HR can add them in Settings.')).toBeInTheDocument();
  expect(screen.getByText('Nothing has happened in the last three weeks.')).toBeInTheDocument();
  expect(screen.getByText('Nobody is on approved leave today.')).toBeInTheDocument();
  expect(screen.queryByText(/System Initialized/i)).not.toBeInTheDocument();
  expect(screen.getByText(/not linked to an employee profile/)).toBeInTheDocument();
});

test('clocking in works and a failed load offers a retry', async () => {
  api.get.mockResolvedValue({ data: FULL });
  attendanceService.clockIn.mockResolvedValue({});
  renderDashboard();
  fireEvent.click(await screen.findByRole('button', { name: 'Clock in' }));
  await waitFor(() => expect(attendanceService.clockIn).toHaveBeenCalled());
});

test('when the server cannot be reached the page says so and can retry', async () => {
  api.get.mockRejectedValueOnce(new Error('network'));
  renderDashboard();
  expect(await screen.findByText(/dashboard could not be loaded/i)).toBeInTheDocument();
  api.get.mockResolvedValue({ data: FULL });
  fireEvent.click(screen.getByRole('button', { name: /try again/i }));
  expect(await screen.findByText(/Welcome back, Priya!/)).toBeInTheDocument();
});
