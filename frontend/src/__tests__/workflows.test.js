import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import api from '../services/api';
import Recognition from '../pages/recognition/Recognition';
import Training from '../pages/training/Training';
import Onboarding from '../pages/onboarding/Onboarding';
import Offboarding from '../pages/offboarding/Offboarding';
import Payroll from '../pages/payroll/Payroll';
import Analytics from '../pages/analytics/Analytics';
import RecruitmentPage from '../pages/recruitment/RecruitmentPage';
import SaveReviewActions from '../components/reviews/SaveReviewActions';
import { formatMoney } from '../utils/format';

vi.mock('../services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('../services/authService', () => ({
  __esModule: true,
  default: { isAdmin: () => true, isManager: () => true, isHR: () => true, getCurrentUser: () => ({ role: 'Admin' }) },
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return { ...actual, ResponsiveContainer: ({ children }) => <div style={{ width: 500, height: 300 }}>{React.cloneElement(children, { width: 500, height: 300 })}</div> };
});

const route = (table) => (url) => {
  const hit = Object.entries(table).find(([key]) => (key.endsWith('*') ? url.startsWith(key.slice(0, -1)) : url === key));
  return hit ? Promise.resolve({ data: typeof hit[1] === 'function' ? hit[1](url) : hit[1] }) : Promise.reject(new Error(`unexpected GET ${url}`));
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('user', JSON.stringify({ role: 'Admin', employee_id: 'me' }));
});

test('Recognition shows the newest first and filters by search, badge and who it involves', async () => {
  api.get.mockImplementation(route({
    '/api/recognition/': { badges: { kudos: { label: 'Great work', points: 10 }, mentor: { label: 'Mentor', points: 15 } }, recognitions: [
      { _id: '1', from_name: 'Ben', to_name: 'Fiona', badge: 'mentor', points: 15, message: 'Thanks for the codebase tour', created_at: new Date().toISOString(), to_department: 'Engineering' },
      { _id: '2', from_name: 'Tariq', to_name: 'Rahul', badge: 'kudos', points: 10, message: 'Covered for me', created_at: '2026-01-01T10:00:00Z', to_department: 'Sales' },
    ] },
    '/api/recognition/leaderboard/*': { leaderboard: [] },
    '/api/recognition/me/': { name: 'Fiona', points: 15, given: 0, received: [{}], achievements: [] },
    '/api/employees/*': { results: [{ _id: 'e1', first_name: 'Fiona', last_name: 'G', employee_id: 'EMP-1', department: 'Engineering' }] },
  }));
  render(<Recognition />);
  expect(await screen.findByText('Thanks for the codebase tour')).toBeInTheDocument();
  expect(screen.getByText(/just now/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search recognition'), { target: { value: 'covered' } });
  expect(screen.queryByText('Thanks for the codebase tour')).not.toBeInTheDocument();
  expect(screen.getByText('Covered for me')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search recognition'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Received by me' }));
  expect(screen.getByText('Thanks for the codebase tour')).toBeInTheDocument();
  expect(screen.queryByText('Covered for me')).not.toBeInTheDocument();
});

test('Training assignments can be searched and filtered', async () => {
  api.get.mockImplementation(route({
    '/api/training/mine/': { assignments: [] },
    '/api/training/recommendations/': { skill_gaps: [], recommendations: [] },
    '/api/training/courses/': { courses: [] },
    '/api/training/assignments/': { assignments: [
      { _id: 'a', employee_name: 'Eli Employee', course_title: 'Information Security', status: 'Assigned', department: 'Engineering', due_date: '2026-11-20' },
      { _id: 'b', employee_name: 'Ben Hartley', course_title: 'Information Security', status: 'Completed', department: 'Sales', due_date: '2026-10-24' },
      { _id: 'c', employee_name: 'Olivia Bennett', course_title: 'Kubernetes', status: 'In Progress', department: 'Engineering', due_date: '2026-12-15', overdue: true },
    ] },
    '/api/employees/departments/': { results: [{ name: 'Engineering' }, { name: 'Sales' }] },
  }));
  render(<Training />);
  fireEvent.click(await screen.findByRole('tab', { name: /all assignments/i }));
  expect(await screen.findByText(/Eli Employee — Information Security/)).toBeInTheDocument();
  expect(screen.getByText('3 assignments')).toBeInTheDocument();
  expect(screen.getByText('1 overdue')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search assignments'), { target: { value: 'kube' } });
  expect(screen.queryByText(/Eli Employee/)).not.toBeInTheDocument();
  expect(screen.getByText(/Olivia Bennett — Kubernetes/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search assignments'), { target: { value: '' } });
  fireEvent.click(screen.getByLabelText('Overdue only'));
  expect(screen.queryByText(/Eli Employee/)).not.toBeInTheDocument();
  expect(screen.getByText(/Olivia Bennett/)).toBeInTheDocument();
});

test('Onboarding lists people and shows one checklist at a time', async () => {
  const row = (id, name, progress, tasks) => ({ _id: id, employee_id: id, employee_name: name, position: 'Engineer', department: 'Engineering', hire_date: '2026-10-01', progress, tasks });
  api.get.mockImplementation(route({
    '/api/onboarding/': { onboardings: [
      row('o1', 'Zoya Khan', 50, [{ id: 1, title: 'Meet your manager', owner: 'employee', done: true }, { id: 2, title: 'Create accounts and email', owner: 'hr', done: false }]),
      row('o2', 'Emily Chen', 100, [{ id: 1, title: 'Read the handbook', owner: 'employee', done: true }]),
    ] },
    '/api/employees/*': { results: [] },
  }));
  render(<Onboarding />);
  expect(await screen.findByText('Select an employee on the left to see their onboarding checklist.')).toBeInTheDocument();
  expect(screen.queryByText('Create accounts and email')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Zoya Khan'));
  expect(await screen.findByText('Create accounts and email')).toBeInTheDocument();
  expect(screen.queryByText('Read the handbook')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /completed \(1\)/i }));
  expect(screen.queryByText('Zoya Khan', { selector: 'span' })).toBeNull();
});

test('Exit management filters by status and lets HR approve', async () => {
  api.get.mockImplementation(route({
    '/api/offboarding/': { notice_period_days: 60, requests: [
      { _id: 'r1', employee_name: 'Hiroshi Sato', employee_code: 'EMP-1', position: 'DevOps', department: 'Engineering', exit_type: 'Resignation', reason_category: 'Career growth', status: 'Pending', last_working_day: '2026-11-19', requested_at: '2026-10-24', checklist: [] },
      { _id: 'r2', employee_name: 'Peter Nwosu', employee_code: 'EMP-2', position: 'Analyst', department: 'Data', exit_type: 'Resignation', reason_category: 'Compensation', status: 'Completed', last_working_day: '2026-06-28', requested_at: '2026-05-24', checklist: [] },
    ] },
    '/api/offboarding/analytics/': { total_exits: 8, open_requests: 1, reasons: { Compensation: 2 }, exits_12m: 8, turnover_rate_12m: 15.1, avg_tenure_years: 1.5, exit_survey: null },
    '/api/employees/*': { results: [] },
  }));
  api.put.mockResolvedValue({ data: {} });
  render(<Offboarding />);
  expect(await screen.findByText('Hiroshi Sato')).toBeInTheDocument();
  expect(screen.getByText('15.1%')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /completed \(1\)/i }));
  expect(screen.queryByText('Hiroshi Sato')).not.toBeInTheDocument();
  expect(screen.getByText('Peter Nwosu')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /all \(2\)/i }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Approve' })[0]);
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/offboarding/r1/', { status: 'Approved' }));
});

test('Payroll shows an employee their pay in rupees', async () => {
  api.get.mockImplementation(route({
    '/api/payroll/run/': { period: 'October 2026', status: 'Not generated', totals: { employees: 0 }, checks: [], counts: {} },
    '/api/payroll/': { results: [] },
    '/api/payroll/me/': { results: [{ _id: 's1', period: 'September 2026', date: '2026-09-30', status: 'Paid', gross_salary: 98200, total_deductions: 2000, net_salary: 96200 }] },
    '/api/payroll/summary/': { summary: { basic: 40000, hra: 20000, special_allowance: 38200, gross_salary: 98200, provident_fund: 1800, esi: 0, professional_tax: 200, tax: 0, total_deductions: 2000,
      net_salary: 96200, ctc_monthly: 100000, employer_pf: 1800, pay_items: [], paid_days: 22, working_days: 22, lop_days: 0 }, missing: ['PAN'] },
    '/api/employees/*': { results: [] },
  }));
  render(<Payroll />);
  expect(await screen.findByText(/No payslips for October 2026 yet/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /my payslips/i }));
  expect(await screen.findByText('September 2026')).toBeInTheDocument();
  expect(screen.getAllByText(formatMoney(96200)).length).toBeGreaterThan(0);
  expect(screen.getByText(/Your PAN is missing/)).toBeInTheDocument();
  expect(formatMoney(96200)).toBe('₹96,200');
});

test('Analytics renders its tabs from the report', async () => {
  const trend = [{ month: 'Sep 2026', headcount: 50, joined: 1, left: 0 }];
  api.get.mockImplementation(route({
    '/api/ai/hr-analytics/': {
      generated_at: '2026-10-26T10:00:00Z',
      workforce: { active: 50, joined_12m: 6, left_12m: 8, attrition_pct: 15.1, joined_this_month: 1, avg_tenure_years: 3, avg_age: 33, avg_span: 4, avg_tenure_at_exit: 1.5, trend,
        by_department: [{ name: 'Engineering', value: 20 }], by_gender: [{ name: 'Female', value: 24 }], by_type: [], by_location: [], tenure_bands: [], age_bands: [], attrition_by_department: [],
        insights: ['50 people are active; 6 joined and 8 left in the last 12 months.', 'Attrition over 12 months is 15.1%.'] },
      hiring: { open_jobs: 4, candidates: 14, in_process: 9, offers: 1, hired: 1, avg_days_to_hire: 12, funnel: [], by_source: [], jobs: [], insights: [] },
      attendance: { rate_4w: 93, avg_hours: 8.3, pending_leaves: 3, leave_days_fy: 120, weekly: [], modes: [], leave_by_type: [], leave_per_head_by_department: [], lop_days_fy: 4, insights: [] },
      performance: { avg_rating: 3.9, rated_people: 40, open_pips: 2, training_completion_pct: 70, training_overdue: 5, distribution: [], by_department: [], okr_by_department: [], training_by_course: [], top_skills: [], insights: [] },
      pay: { annual_ctc: 52000000, median_ctc: 1200000, latest_month: { month: 'September 2026', employer: 4500000, net: 3800000, people: 49 }, trend: [], cost_by_department: [], avg_ctc_by_department: [], ctc_bands: [], gender_pay: [], gender_pay_ratio: null, revisions_12m: 5, missing_salary: 0, insights: ['The annual CTC bill is ₹5,20,00,000 across 49 people.'] },
      engagement: { risk_counts: { High: 2, Medium: 5, Low: 43 }, at_risk: [], exit_reasons: [], survey_history: [], open_tickets: 3, tickets_by_category: [], recognition_by_month: [], expense_by_category: [], expense_total: 0, insights: [], model: { type: 'rules' } },
    },
  }));
  render(<Analytics />);
  expect(await screen.findByText('What the numbers say')).toBeInTheDocument();
  expect(screen.getAllByText('15.1%').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('tab', { name: /pay & cost/i }));
  expect(await screen.findByText(/The annual CTC bill is ₹5,20,00,000/)).toBeInTheDocument();
  expect(screen.getAllByText('₹5.2 Cr').length).toBeGreaterThan(0);
});

test('SaveReviewActions saves once and then sends', async () => {
  api.post.mockResolvedValue({ data: { already_saved: false, review: { _id: 'rv1', status: 'Draft' } } });
  api.put.mockResolvedValue({ data: { review: { _id: 'rv1', status: 'Delivered' } } });
  render(<SaveReviewActions kind="employee" subjectId="e1" review={{ summary: 'x' }} onOpenSaved={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));
  expect(await screen.findByText(/Saved as a draft/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();
  expect(api.post).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /send to employee/i }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/ai/saved-reviews/rv1/', { deliver: true, comment: '' }));
  expect(await screen.findByText(/The employee was notified/)).toBeInTheDocument();
});

test('Candidates can be imported from a pasted list after a review step', async () => {
  api.get.mockImplementation(route({
    '/api/recruitment/jobs/': { jobs: [{ _id: 'j1', title: 'Backend Dev', department: 'Eng', skills: 'Python', status: 'Open', candidate_count: 0 }] },
    '/api/recruitment/jobs/j1/candidates/': { candidates: [] },
    '/api/recruitment/jobs/j1/predictions/': { predictions: [] },
    '/api/employees/departments/*': { results: [] },
  }));
  api.post.mockImplementation((url) => {
    if (url.endsWith('/parse/')) {
      return Promise.resolve({ data: { read_with: 'AI (gemini)', warnings: [], candidates: [
        { row: 1, name: 'Ananya Iyer', email: 'ananya@example.com', skills: 'Python', experience: '4', notice_period_days: 30, current_ctc_lpa: 14, expected_ctc_lpa: 18, duplicate: false },
        { row: 2, name: 'Old Timer', email: 'old@example.com', skills: '', duplicate: true },
      ] } });
    }
    return Promise.resolve({ data: { created: 1, skipped: 0, errors: [] } });
  });
  render(<MemoryRouter><RecruitmentPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /import from a list/i }));
  const box = await screen.findByLabelText('Candidate list');
  fireEvent.change(box, { target: { value: 'Ananya Iyer, 4 yrs, Python, 30 days notice' } });
  fireEvent.click(screen.getByRole('button', { name: /read the list/i }));
  expect(await screen.findByText('Ananya Iyer')).toBeInTheDocument();
  expect(screen.getByText('already added')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /add 1 candidate/i })).toBeEnabled();                 // the duplicate starts unticked
  fireEvent.click(screen.getByRole('button', { name: /add 1 candidate/i }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/recruitment/jobs/j1/candidates/bulk/', { candidates: [expect.objectContaining({ name: 'Ananya Iyer' })] }));
});

test('Resumes are dropped in, read, reviewed and added', async () => {
  api.get.mockImplementation(route({
    '/api/recruitment/jobs/': { jobs: [{ _id: 'j1', title: 'Backend Dev', department: 'Eng', skills: 'Python, SQL', status: 'Open', candidate_count: 0 }] },
    '/api/recruitment/jobs/j1/candidates/': { candidates: [] },
    '/api/recruitment/jobs/j1/predictions/': { predictions: [] },
  }));
  api.post.mockImplementation((url) => {
    if (url.endsWith('/resumes/')) {
      return Promise.resolve({ data: { read: 2, failed: 1, read_with: 'AI (gemini)', rows: [
        { row: 1, file_name: 'ananya.pdf', resume_token: 'a'.repeat(32) + '.pdf', name: 'Ananya Iyer', email: 'ananya@example.com', phone: '+91 98450 12345', skills: 'Python, SQL', experience: '4', match_pct: 100, matched_skills: ['Python', 'SQL'], missing_skills: [], duplicate: false },
        { row: 2, file_name: 'rohit.docx', resume_token: 'b'.repeat(32) + '.docx', name: 'Rohit Verma', email: '', skills: 'Java', match_pct: 0, matched_skills: [], missing_skills: ['Python', 'SQL'], duplicate: false, name_guessed: false },
        { row: 3, file_name: 'scan.pdf', error: 'scan.pdf: no readable text was found.' },
      ] } });
    }
    return Promise.resolve({ data: { created: 2, skipped: 0, errors: [] } });
  });
  render(<MemoryRouter><RecruitmentPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /upload resumes/i }));
  const files = [new File(['x'], 'ananya.pdf', { type: 'application/pdf' }), new File(['x'], 'rohit.docx'), new File(['x'], 'scan.pdf')];
  fireEvent.change(await screen.findByLabelText('Resume files'), { target: { files } });
  expect(screen.getByText('3 resumes ready')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /read 3 resumes/i }));
  expect(await screen.findByDisplayValue('Ananya Iyer')).toBeInTheDocument();
  expect(screen.getByText('scan.pdf: no readable text was found.')).toBeInTheDocument();         // a failed file does not block the others
  fireEvent.change(screen.getByLabelText('Email for rohit.docx'), { target: { value: 'rohit@example.com' } });     // HR fixes a missing e-mail
  fireEvent.click(screen.getByRole('button', { name: /add 2 candidates/i }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/recruitment/jobs/j1/candidates/bulk/', { candidates: [
    expect.objectContaining({ name: 'Ananya Iyer', resume_name: 'ananya.pdf', resume_token: 'a'.repeat(32) + '.pdf' }),
    expect.objectContaining({ name: 'Rohit Verma', email: 'rohit@example.com', resume_name: 'rohit.docx' })] }));
});

test('An opening can be deleted, and the warning counts the candidates that go with it', async () => {
  api.get.mockImplementation(route({
    '/api/recruitment/jobs/': { jobs: [{ _id: 'j1', title: 'Backend Dev', department: 'Eng', skills: 'Python', status: 'Open', candidate_count: 3 }] },
    '/api/recruitment/jobs/j1/candidates/': { candidates: [] },
    '/api/recruitment/jobs/j1/predictions/': { predictions: [] },
  }));
  api.delete.mockResolvedValue({ data: { success: true, deleted_candidates: 3 } });
  render(<MemoryRouter><RecruitmentPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /delete opening/i }));
  expect(await screen.findByText(/3 candidate\(s\) are on this opening/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /delete everything/i }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/recruitment/jobs/j1/', { params: { with_candidates: 1 } }));
  expect(await screen.findByText(/was deleted together with 3 candidate\(s\)/)).toBeInTheDocument();
});
