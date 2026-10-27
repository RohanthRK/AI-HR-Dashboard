import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import axios from 'axios';

import api from '../services/api';
import Recognition from '../pages/recognition/Recognition';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Careers from '../pages/careers/Careers';
import ApplyPage from '../pages/careers/ApplyPage';
import IntegrationsPanel from '../components/settings/IntegrationsPanel';
import SkillCatalogEditor from '../components/skills/SkillCatalogEditor';

vi.mock('../services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('axios', () => ({ __esModule: true, default: { get: vi.fn(), post: vi.fn(), create: vi.fn(() => ({ interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } })) } }));

beforeEach(() => vi.clearAllMocks());

test('Recognition shows the feed, leaderboard and sends kudos', async () => {
  api.get.mockImplementation((url) => {
    if (url === '/api/recognition/') {
      return Promise.resolve({ data: { badges: { kudos: { label: 'Great work', points: 10 } }, recognitions: [
        { _id: 'r1', from_name: 'Bob', to_name: 'Ada', badge: 'kudos', points: 10, message: 'Thanks for the help' }] } });
    }
    if (url === '/api/recognition/leaderboard/') {
      return Promise.resolve({ data: { leaderboard: [{ rank: 1, employee_id: 'a', name: 'Ada', points: 10, recognitions: 1, colleagues: 1 }] } });
    }
    if (url === '/api/recognition/me/') {
      return Promise.resolve({ data: { points: 10, given: 0, received: [{}], achievements: [{ id: 'learner', label: 'Lifelong learner', detail: '3 trainings completed' }] } });
    }
    if (url === '/api/employees/') {
      return Promise.resolve({ data: { results: [{ _id: 'e2', first_name: 'Cy', last_name: 'Other', employee_id: 'EMP-C' }] } });
    }
    return Promise.reject(new Error(url));
  });
  api.post.mockResolvedValue({ data: { success: true } });

  render(<Recognition />);
  expect(await screen.findByText('Thanks for the help')).toBeInTheDocument();
  expect(screen.getByText('1. Ada')).toBeInTheDocument();
  expect(screen.getByText(/Lifelong learner/)).toBeInTheDocument();

  const send = screen.getByRole('button', { name: /send recognition/i });
  expect(send).toBeDisabled();
  fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
  fireEvent.click(await screen.findByText(/Cy Other/));
  fireEvent.change(screen.getByLabelText('Why?'), { target: { value: 'Great demo' } });
  fireEvent.click(send);
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/recognition/', { to: 'e2', badge: 'kudos', message: 'Great demo' }));
  expect(await screen.findByText('Recognition sent!')).toBeInTheDocument();
});

test('Careers page lists jobs without logging in, chats, and links to the application form', async () => {
  axios.get.mockResolvedValue({ data: { company: 'Kaveri Technologies', jobs: [{ _id: 'j1', title: 'Data Engineer', department: 'Data', location: 'Remote', skills: 'SQL, Python', description: 'Build pipelines' }] } });
  axios.post.mockResolvedValue({ data: { reply: 'Data Engineer needs SQL.' } });

  render(<MemoryRouter><Careers /></MemoryRouter>);
  expect(await screen.findByText('Data Engineer')).toBeInTheDocument();
  expect(screen.getByText(/Careers at Kaveri Technologies/)).toBeInTheDocument();
  expect(screen.getByText('SQL')).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText('Type your question'), { target: { value: 'sql jobs?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByText('Data Engineer needs SQL.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Apply' })).toHaveAttribute('href', '/apply/j1');
});

test('The application form fills itself from a resume and submits it with the source channel', async () => {
  axios.get.mockResolvedValue({ data: { company: 'Kaveri Technologies', job: { _id: 'j1', title: 'Data Engineer', department: 'Data', location: 'Pune', skills: 'SQL', description: 'Build pipelines', employment_type: 'Full-time' } } });
  axios.post.mockImplementation((url) => (url.endsWith('/resume-parse/')
    ? Promise.resolve({ data: { fields: { name: 'Ananya Iyer', email: 'ananya@example.com', phone: '+91 98450 12345', skills: 'SQL, Python', experience: 4 }, read_with: 'AI (gemini)' } })
    : Promise.resolve({ data: { success: true } })));

  render(<MemoryRouter initialEntries={['/apply/j1?src=LinkedIn']}><Routes><Route path="/apply/:jobId" element={<ApplyPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByText('Data Engineer')).toBeInTheDocument();
  const file = new File(['resume text'], 'ananya.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText('Resume file'), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByLabelText(/Full name/)).toHaveValue('Ananya Iyer'));
  expect(screen.getByLabelText(/^Email/)).toHaveValue('ananya@example.com');
  expect(screen.getByLabelText(/Total experience/)).toHaveValue(4);
  expect(screen.getByText(/We filled in your details from your resume/)).toBeInTheDocument();

  expect(screen.getByRole('button', { name: /submit application/i })).toBeDisabled();            // consent first
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /submit application/i }));
  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/apply/'), expect.any(FormData)));
  const sent = axios.post.mock.calls.find((c) => c[0].endsWith('/apply/'))[1];
  expect([sent.get('name'), sent.get('job_id'), sent.get('source'), sent.get('resume').name]).toEqual(['Ananya Iyer', 'j1', 'LinkedIn', 'ananya.pdf']);
  expect(await screen.findByText(/Thank you, Ananya!/)).toBeInTheDocument();
});

test('A closed opening says so instead of showing a form', async () => {
  axios.get.mockRejectedValue({ response: { status: 404 } });
  render(<MemoryRouter initialEntries={['/apply/zzz']}><Routes><Route path="/apply/:jobId" element={<ApplyPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByText('This position is not open any more.')).toBeInTheDocument();
});

test('IntegrationsPanel shows a new webhook secret once and lists hooks', async () => {
  api.get.mockResolvedValue({ data: { events: ['leave.approved', 'employee.created'], webhooks: [
    { _id: 'h1', name: 'HRIS', url: 'https://h.test', events: ['leave.approved'], active: true, secret: 'abcd...', last_delivery: { event: 'ping', status: 'HTTP 200' } }] } });
  api.post.mockResolvedValue({ data: { webhook: { _id: 'h2', secret: 'f'.repeat(48) } } });

  render(<IntegrationsPanel />);
  expect(await screen.findByText(/HRIS/)).toBeInTheDocument();
  expect(screen.getByText(/last: ping HTTP 200/)).toBeInTheDocument();

  const add = screen.getByRole('button', { name: /add webhook/i });
  expect(add).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Payroll' } });
  fireEvent.change(screen.getByLabelText(/Endpoint URL/), { target: { value: 'https://p.test/hook' } });
  fireEvent.click(screen.getByLabelText('employee.created'));
  fireEvent.click(add);
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/integrations/webhooks/',
    { name: 'Payroll', url: 'https://p.test/hook', events: ['employee.created'] }));
  expect(await screen.findByText('f'.repeat(48))).toBeInTheDocument();
});

test('SkillCatalogEditor validates and saves the edited catalogue', async () => {
  const catalog = {
    categories: [{ id: 'tech', name: 'Technical', skills: [{ id: 'py', name: 'Python', description: '' }] }],
    roles: [{ id: 'dev', title: 'Developer', description: '', requiredSkills: ['py'], recommendedSkills: [] }],
  };
  const onSave = vi.fn().mockResolvedValue();
  render(<SkillCatalogEditor open catalog={catalog} onClose={vi.fn()} onSave={onSave} />);

  fireEvent.click(screen.getByRole('button', { name: /add skill/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByText('Every category and skill needs a name.')).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();

  const skillFields = screen.getAllByLabelText('Skill');
  fireEvent.change(skillFields[skillFields.length - 1], { target: { value: 'Rust' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  const saved = onSave.mock.calls[0][0];
  expect(saved.categories[0].skills.map((s) => s.name)).toEqual(['Python', 'Rust']);
  expect(saved.roles[0].requiredSkills).toEqual(['py']);
});
