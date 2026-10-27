import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

import attendanceService from '../services/attendanceService';
import authService from '../services/authService';
import Attendance from '../pages/attendance/Attendance';
import MonthCalendar, { hm } from '../components/attendance/MonthCalendar';
import AttendanceOverview from '../components/attendance/AttendanceOverview';

vi.mock('../services/attendanceService', () => ({
  __esModule: true,
  default: { getStatus: vi.fn(), clockIn: vi.fn(), clockOut: vi.fn(), getMyAttendance: vi.fn(), getMonth: vi.fn(), getOverview: vi.fn(), setExpectedHours: vi.fn() },
}));
vi.mock('../services/authService', () => ({ __esModule: true, default: { getCurrentUser: vi.fn() } }));

const day = (date, extra = {}) => ({ date, weekday: '', kind: 'upcoming', hours: 0, expected: 0, clock_in: null, clock_out: null, work_mode: '', late: false, target_met: null, short_by: 0, open: false,
  missing_clock_out: false, leave_type: '', holiday: '', half_day: false, logs: [], ...extra });

// September 2026 (starts on a Tuesday): a full day, a short late day, an absence, a holiday, leave and weekends
const september = () => {
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = `2026-09-${String(i + 1).padStart(2, '0')}`;
    return day(date, new Date(`${date}T12:00:00`).getDay() % 6 === 0 ? { kind: 'weekend' } : { kind: 'absent', expected: 8 });
  });
  days[0] = day('2026-09-01', { kind: 'present', hours: 8, expected: 8, target_met: true, logs: [{ clock_in: '2026-09-01T03:30:00+00:00', clock_out: '2026-09-01T11:30:00+00:00' }] });
  days[1] = day('2026-09-02', { kind: 'present', hours: 6, expected: 8, target_met: false, short_by: 2, late: true, logs: [{ clock_in: '2026-09-02T04:45:00+00:00', clock_out: '2026-09-02T10:45:00+00:00' }] });
  days[2] = day('2026-09-03', { kind: 'holiday', holiday: 'Ganesh Chaturthi' });
  days[3] = day('2026-09-04', { kind: 'leave', leave_type: 'Casual Leaves' });
  return {
    month: '2026-09', label: 'September 2026', employee: { id: 'e1', code: 'EMP-1', name: 'Asha Rao', position: 'Engineer', department: 'Engineering' },
    expected_hours: 8, own_expected_hours: null, default_hours: 8, late_after: '09:30', days,
    summary: { working_days: 20, present_days: 2, absent_days: 16, leave_days: 1, late_days: 1, short_days: 1, missing_clock_out_days: 0, hours: 14, expected_hours: 160, overtime_hours: 0, holidays: 1, avg_hours: 7, hours_pct: 9 },
  };
};

const row = (name, extra = {}) => ({ employee_id: name, employee_code: 'EMP', name, position: 'Engineer', department: 'Engineering', team: '', expected_per_day: 8, custom_hours: false,
  working_days: 10, present_days: 10, absent_days: 0, leave_days: 0, late_days: 0, short_days: 0, missing_clock_out_days: 0, hours: 80, expected_hours: 80, overtime_hours: 0, hours_pct: 100,
  flags: [], status: 'On track', ...extra });

const OVERVIEW = {
  from: '2026-10-01', to: '2026-10-27', default_hours: 8, late_after: '09:30', single_day: false,
  totals: { employees: 3, hours: 190, expected_hours: 240, hours_pct: 79, absent_days: 2, short_days: 3, late_days: 1, missing_clock_out_days: 0, leave_days: 0, need_attention: 2 },
  rows: [
    row('Ann Lee'),
    row('Bo Chen', { department: 'Sales', short_days: 3, hours: 60, hours_pct: 75, flags: ['3 day(s) short on hours'], status: 'Needs attention' }),
    row('Cy Diaz', { department: 'Sales', absent_days: 2, hours: 50, hours_pct: 63, flags: ['2 day(s) with no attendance'], status: 'Needs attention', expected_per_day: 6, custom_hours: true }),
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  attendanceService.getStatus.mockResolvedValue({ is_clocked_in: false });
  attendanceService.getMonth.mockResolvedValue(september());
  attendanceService.getOverview.mockResolvedValue(OVERVIEW);
  authService.getCurrentUser.mockReturnValue({ role: 'Employee' });
});

describe('hm()', () => {
  it('writes hours the way people say them', () => {
    expect(hm(8)).toBe('8h');
    expect(hm(7.5)).toBe('7h 30m');
    expect(hm(0.75)).toBe('45m');
    expect(hm(0)).toBe('0m');
    expect(hm(undefined)).toBe('0m');
  });
});

describe('MonthCalendar', () => {
  it('shows the whole month at once with hours against what is expected', async () => {
    render(<MonthCalendar />);
    expect(await screen.findByText('September 2026')).toBeInTheDocument();
    expect(attendanceService.getMonth).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}$/), undefined);
    expect(within(screen.getByRole('grid')).getAllByRole('gridcell')).toHaveLength(30);
    expect(screen.getByText('Ganesh Chaturthi')).toBeInTheDocument();
    expect(screen.getByText('2h short')).toBeInTheDocument();
    expect(screen.getByText('LATE')).toBeInTheDocument();
    expect(screen.getByText(/of 160h expected · 9%/)).toBeInTheDocument();
    expect(screen.getByText(/Expected 8h a day \(company default\)/)).toBeInTheDocument();
  });

  it('explains a day when it is chosen', async () => {
    render(<MonthCalendar />);
    fireEvent.click(await screen.findByLabelText(/2 Sept 2026: Worked 2h less than expected, late/));
    expect(screen.getByText(/Late: first in after 09:30/)).toBeInTheDocument();
    expect(screen.getByText((_, el) => el.tagName === 'P' && el.textContent.startsWith('Worked 6h of 8h expected'))).toBeInTheDocument();
  });

  it('asks for another month when you page', async () => {
    render(<MonthCalendar employeeId="e1" />);
    await screen.findByText('September 2026');
    fireEvent.click(screen.getByLabelText('Previous month'));
    await waitFor(() => expect(attendanceService.getMonth).toHaveBeenCalledTimes(2));
    expect(attendanceService.getMonth.mock.calls[1][1]).toBe('e1');
    expect(screen.getByText(/Asha Rao/)).toBeInTheDocument();
  });

  it('lets HR change the expected hours, and nobody else', async () => {
    const { unmount } = render(<MonthCalendar employeeId="e1" />);
    await screen.findByText('September 2026');
    expect(screen.queryByLabelText('Change expected hours')).not.toBeInTheDocument();
    unmount();
    attendanceService.setExpectedHours.mockResolvedValue({ success: true });
    render(<MonthCalendar employeeId="e1" canEditHours />);
    fireEvent.click(await screen.findByLabelText('Change expected hours'));
    fireEvent.change(screen.getByLabelText('Hours per working day'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/between 1 and 16/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Hours per working day'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(attendanceService.setExpectedHours).toHaveBeenCalledWith('e1', 6));
  });
});

describe('AttendanceOverview', () => {
  it('lists everyone with hours against expected and puts the people to check first', async () => {
    render(<AttendanceOverview />);
    expect(await screen.findByText('Ann Lee')).toBeInTheDocument();
    const names = screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);
    expect(names[0]).toMatch(/^(Bo Chen|Cy Diaz)/);                      // the ones needing attention come before Ann
    expect(names[2]).toMatch(/^Ann Lee/);
    expect(screen.getByText('6h a day (set for them)')).toBeInTheDocument();
    expect(screen.getByText('2 day(s) with no attendance')).toBeInTheDocument();
    const [from, to] = attendanceService.getOverview.mock.calls[0];
    expect(from <= to).toBe(true);
  });

  it('searches and filters', async () => {
    render(<AttendanceOverview />);
    await screen.findByText('Ann Lee');
    fireEvent.change(screen.getByLabelText('Search attendance'), { target: { value: 'cy' } });
    expect(screen.queryByText('Ann Lee')).not.toBeInTheDocument();
    expect(screen.getByText('Cy Diaz')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search attendance'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Short on hours' }));
    expect(screen.getByText('Bo Chen')).toBeInTheDocument();
    expect(screen.queryByText('Cy Diaz')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Absent' }));
    expect(screen.getByText('Cy Diaz')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Everyone' }));
    fireEvent.change(screen.getByLabelText('Search attendance'), { target: { value: 'nobody like this' } });
    expect(screen.getByText('Nobody matches.')).toBeInTheDocument();
  });

  it('reloads for another period and opens a person', async () => {
    const open = vi.fn();
    render(<AttendanceOverview onOpenPerson={open} />);
    fireEvent.click(await screen.findByText('Ann Lee'));
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ employee_id: 'Ann Lee' }));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    await waitFor(() => expect(attendanceService.getOverview).toHaveBeenCalledTimes(2));
    const [from, to] = attendanceService.getOverview.mock.calls[1];
    expect(from).toBe(to);
  });

  it('shows in/out times when a single day is chosen', async () => {
    attendanceService.getOverview.mockResolvedValue({
      ...OVERVIEW, from: '2026-10-27', to: '2026-10-27', single_day: true,
      rows: [row('Ann Lee', { status: 'Short on hours', day: { clock_in: '2026-10-27T03:45:00+00:00', clock_out: '2026-10-27T09:00:00+00:00', late: true } })],
    });
    render(<AttendanceOverview />);
    expect(await screen.findByText('9:15 AM')).toBeInTheDocument();
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    expect(within(screen.getAllByRole('row')[1]).getByText('Short on hours')).toBeInTheDocument();
  });

  it('shows the hours editor only to HR', async () => {
    const { unmount } = render(<AttendanceOverview />);
    await screen.findByText('Ann Lee');
    expect(screen.queryByLabelText('Set expected hours for Ann Lee')).not.toBeInTheDocument();
    unmount();
    render(<AttendanceOverview canEditHours />);
    fireEvent.click(await screen.findByLabelText('Set expected hours for Ann Lee'));
    expect(await screen.findByText('Expected hours for Ann Lee')).toBeInTheDocument();
  });
});

describe('Attendance page', () => {
  it('opens on the calendar, with no voice clock-in', async () => {
    render(<Attendance />);
    expect(await screen.findByText('September 2026')).toBeInTheDocument();
    expect(screen.queryByText(/voice/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /everyone|team/i })).not.toBeInTheDocument();
    expect(await screen.findByText('Not clocked in')).toBeInTheDocument();
  });

  it('gives HR the Everyone tab and managers the team tab', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'Admin' });
    const { unmount } = render(<Attendance />);
    fireEvent.click(await screen.findByRole('tab', { name: /everyone/i }));
    expect(await screen.findByText('Ann Lee')).toBeInTheDocument();
    unmount();
    authService.getCurrentUser.mockReturnValue({ role: 'Manager' });
    render(<Attendance />);
    expect(await screen.findByRole('tab', { name: /my team/i })).toBeInTheDocument();
  });

  it('clocks in and refreshes', async () => {
    attendanceService.clockIn.mockResolvedValue({ clock_in_time: '2026-10-27T03:45:00+00:00' });
    render(<Attendance />);
    await screen.findByText('Not clocked in');
    fireEvent.click(screen.getByRole('button', { name: 'Clock in' }));
    expect(await screen.findByText('9:15 AM')).toBeInTheDocument();
    expect(attendanceService.getMonth).toHaveBeenCalledTimes(2);
  });
});
