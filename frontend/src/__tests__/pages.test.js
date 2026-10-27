import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import api from '../services/api';
import Compliance from '../pages/compliance/Compliance';
import RecruitmentPage from '../pages/recruitment/RecruitmentPage';
import Settings from '../pages/settings/Settings';
import { LeavesTab, PerformanceTab } from '../components/employees/ProfileTabs';

vi.mock('../services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    isAdmin: () => true,
    isManager: () => true,
    isHR: () => true,
    getCurrentUser: () => ({ role: 'Admin' }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const complianceApi = (alerts) => (url) => {
  if (url === '/api/reports/compliance/') return Promise.resolve({ data: { total: alerts.length, critical: alerts.filter((x) => x.severity === 'critical').length, alerts } });
  return Promise.resolve({ data: { count: 4, results: [] } });
};

test('Compliance lists alerts by employee and sends reminders', async () => {
  api.get.mockImplementation(complianceApi([
    { kind: 'document', severity: 'critical', employee_id: 'a', employee: 'Ada Admin', department: 'HR', item: 'Visa', date: '2026-01-01', message: 'Visa expired on 2026-01-01' },
    { kind: 'training', severity: 'warning', employee_id: 'b', employee: 'Bob Worker', department: 'Engineering', item: 'Safety', message: "Mandatory training 'Safety' has not been assigned" },
  ]));
  api.post.mockResolvedValue({ data: { sent: 2 } });

  render(<Compliance />);
  expect(await screen.findByText('Ada Admin')).toBeInTheDocument();
  expect(screen.getAllByText('Open issues').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('tab', { name: /all issues/i }));
  expect(await screen.findByText('Visa expired on 2026-01-01')).toBeInTheDocument();
  expect(screen.getByText('critical')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Search compliance issues'), { target: { value: 'bob' } });
  expect(screen.queryByText('Visa expired on 2026-01-01')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search compliance issues'), { target: { value: '' } });

  fireEvent.click(screen.getByRole('button', { name: /remind everyone listed/i }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/reports/compliance/notify/', {}));
  expect(await screen.findByText('Sent 2 reminder(s).')).toBeInTheDocument();
});

test('Compliance shows an empty state', async () => {
  api.get.mockImplementation(complianceApi([]));
  render(<Compliance />);
  expect(await screen.findByText('No compliance issues found. Everything is up to date.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /remind everyone listed/i })).toBeDisabled();
});

test('Recruitment shows candidates in a table with fit and skill match', async () => {
  api.get.mockImplementation((url) => {
    if (url === '/api/recruitment/jobs/') {
      return Promise.resolve({ data: { jobs: [{ _id: 'j1', title: 'Backend Dev', department: 'Eng', skills: 'Python, SQL', status: 'Open', candidate_count: 1, openings: 2 }] } });
    }
    if (url.endsWith('/candidates/')) {
      return Promise.resolve({ data: { candidates: [{ _id: 'c1', name: 'Zed Rao', skills: 'Python', stage: 'Interview', phone: '+91 98450 12345', location: 'Pune',
        current_company: 'Infosys', current_title: 'Engineer', experience: '4', notice_period_days: 30, current_ctc_lpa: 12, expected_ctc_lpa: 16 }] } });
    }
    if (url.endsWith('/predictions/')) {
      return Promise.resolve({ data: { predictions: [{ candidate_id: 'c1', score: 80, likelihood: 'High', reasons: ['1 of 2 required skills'] }] } });
    }
    return Promise.reject(new Error(`unexpected ${url}`));
  });

  render(<RecruitmentPage />);
  expect(await screen.findByText('Zed Rao')).toBeInTheDocument();
  expect(screen.getByText('80 · High')).toBeInTheDocument();
  expect(screen.getByText('50% of required skills')).toBeInTheDocument();
  expect(screen.getByText('4 yrs')).toBeInTheDocument();
  expect(screen.getByText('30 days')).toBeInTheDocument();
  expect(screen.getByText('12 → 16')).toBeInTheDocument();
  expect(screen.getByText(/Skills: Python, SQL/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /import from a list/i })).toBeEnabled();
});

test('Settings loads values and saves them', async () => {
  api.get.mockResolvedValue({
    data: {
      general: { companyName: 'Acme', timezone: 'UTC', holidays: [{ date: '2099-12-25', name: 'Christmas Day' }] },
      notifications: { leaveApprovals: true, expenseUpdates: true, ticketUpdates: true, emailDelivery: false, webhookDelivery: false },
      payroll: { basicPct: 40, hraPct: 50, pfPct: 12, pfWageCeiling: 15000, esiThreshold: 21000, ptAmount: 200, ptThreshold: 25000, tdsEnabled: true, payOvertime: false, overtimeMultiplier: 1.5 },
      knowledge: { faq: [], requiredDocuments: [], employeeTasks: [], hrTasks: [] },
      integrations: { emailConfigured: false, webhookConfigured: false },
    },
  });
  api.put.mockResolvedValue({ data: {} });

  render(<Settings />);
  const company = await screen.findByDisplayValue('Acme');
  fireEvent.change(company, { target: { value: 'Globex' } });
  fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
  await waitFor(() => expect(api.put).toHaveBeenCalled());
  const [url, payload] = api.put.mock.calls[0];
  expect(url).toBe('/api/settings/');
  expect(payload.general.companyName).toBe('Globex');
  expect(payload.payroll.pfPct).toBe(12);
});

test('LeavesTab shows the remaining balance and handles forbidden access', async () => {
  api.get.mockResolvedValueOnce({
    data: { year: 2026, entitlements: { 'Earned Leaves': 18 }, used: { 'Earned Leaves': 4 }, pending: { 'Earned Leaves': 2 } },
  });
  const { unmount } = render(<LeavesTab employee={{ _id: 'e1' }} />);
  expect(await screen.findByText(/12 \/ 18 days left · 4 used · 2 pending/)).toBeInTheDocument();
  unmount();

  api.get.mockRejectedValueOnce({ response: { status: 403 } });
  render(<LeavesTab employee={{ _id: 'e2' }} />);
  expect(await screen.findByText('You can only see your own leave balance.')).toBeInTheDocument();
});

test('PerformanceTab shows the score and recommendations', async () => {
  api.get.mockResolvedValue({
    data: { performance: 4.2, growthPotential: 'High', recommendations: [{ title: 'Career path', description: 'Consider for the leadership track.' }] },
  });
  render(
    <MemoryRouter>
      <PerformanceTab employee={{ _id: 'e1' }} />
    </MemoryRouter>
  );
  expect(await screen.findByText('4.2')).toBeInTheDocument();
  expect(screen.getByText('Consider for the leadership track.')).toBeInTheDocument();
});
