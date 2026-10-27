import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Paper, Typography, IconButton, Button, LinearProgress, Alert, CircularProgress } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import attendanceService from '../../services/attendanceService';
import { formatTime, formatDate } from '../../utils/format';
import ExpectedHoursDialog from './ExpectedHoursDialog';

// "7h 30m", "45m", "0m"
export const hm = (hours) => {
  const mins = Math.round((Number(hours) || 0) * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const COLORS = {
  good: '#8ce99a',
  short: '#ffe066',
  open: '#74c0fc',
  noOut: '#ffc078',
  absent: '#ffa8a8',
  leave: '#a5d8ff',
  holiday: '#d0bfff',
};

// How one day is drawn: colour, a short label, and the sentence used in the details panel.
export const dayLook = (d) => {
  switch (d.kind) {
    case 'present':
      if (d.open) return { bg: COLORS.open, label: hm(d.hours), sub: 'Working', text: 'Clocked in and still working' };
      if (d.missing_clock_out) return { bg: COLORS.noOut, label: hm(d.hours), sub: 'No clock-out', text: 'Clocked in but never clocked out' };
      if (d.target_met === false) return { bg: COLORS.short, label: hm(d.hours), sub: `${hm(d.short_by)} short`, text: `Worked ${hm(d.short_by)} less than expected` };
      if (!d.expected) return { bg: COLORS.good, label: hm(d.hours), sub: 'Day off', text: 'Worked on a day off' };
      return { bg: COLORS.good, label: hm(d.hours), sub: 'Full day', text: 'Put in the expected hours' };
    case 'absent': return { bg: COLORS.absent, label: 'Absent', sub: '', text: 'No attendance recorded' };
    case 'leave': return { bg: COLORS.leave, label: d.half_day ? 'Half day' : 'Leave', sub: (d.leave_type || '').replace(' Leaves', ''), text: `On ${d.leave_type || 'leave'}` };
    case 'holiday': return { bg: COLORS.holiday, label: 'Holiday', sub: d.holiday, text: d.holiday };
    case 'pending': return { bg: null, label: 'Not in yet', sub: '', text: 'Has not clocked in yet today', dashed: true };
    case 'weekend': return { bg: null, label: '', sub: '', text: 'Weekend', muted: true };
    default: return { bg: null, label: '', sub: '', text: d.kind === 'upcoming' ? 'Upcoming' : 'Not employed on this day', muted: true };
  }
};

const LEGEND = [
  ['Full day', COLORS.good], ['Short on hours', COLORS.short], ['Working now', COLORS.open], ['No clock-out', COLORS.noOut],
  ['Absent', COLORS.absent], ['Leave', COLORS.leave], ['Holiday', COLORS.holiday],
];

const monthOf = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const shiftMonth = (month, by) => {
  const [y, m] = month.split('-').map(Number);
  return monthOf(new Date(y, m - 1 + by, 1));
};

const Stat = ({ label, value, warn }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 800, color: warn && Number(value) ? '#e03131' : 'inherit' }}>{value}</Typography>
  </Box>
);

/**
 * One person's month on a single screen: every day coloured by what happened, hours against what is expected,
 * and a side panel with the month's totals and the chosen day's detail.
 * `employeeId` omitted = the signed-in user; `canEditHours` lets HR change how many hours this person is expected to work.
 */
const MonthCalendar = ({ employeeId, canEditHours = false }) => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(monthOf(new Date()));
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(todayIso);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await attendanceService.getMonth(month, employeeId));
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load this month.');
    } finally {
      setLoading(false);
    }
  }, [month, employeeId]);

  useEffect(() => { load(); }, [load]);

  const cells = useMemo(() => {
    if (!data) return [];
    const lead = (new Date(`${data.days[0].date}T12:00:00`).getDay() + 6) % 7;       // Monday first
    return [...Array(lead).fill(null), ...data.days];
  }, [data]);

  const day = data?.days.find((d) => d.date === selected);
  const s = data?.summary;
  const isThisMonth = month === monthOf(new Date());

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <IconButton size="small" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeftIcon /></IconButton>
        <Typography variant="h6" sx={{ fontWeight: 900, minWidth: 160, textAlign: 'center' }}>{data?.label || month}</Typography>
        <IconButton size="small" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRightIcon /></IconButton>
        {!isThisMonth && <Button size="small" onClick={() => { setMonth(monthOf(new Date())); setSelected(todayIso); }}>This month</Button>}
        {data && employeeId && (
          <Typography sx={{ ml: 1, fontWeight: 800 }}>{data.employee.name} <Typography component="span" color="text.secondary">· {data.employee.position}{data.employee.department ? `, ${data.employee.department}` : ''}</Typography></Typography>
        )}
        {loading && <CircularProgress size={18} sx={{ ml: 1 }} />}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      {data && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 300px' }, gap: 2, alignItems: 'start' }}>
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px', mb: '4px' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
                <Typography key={w} variant="caption" sx={{ fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', color: 'text.secondary' }}>{w}</Typography>
              ))}
            </Box>
            <Box
              role="grid"
              aria-label={`Attendance for ${data.label}`}
              sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'clamp(54px, calc((100vh - 430px) / 6), 84px)', gap: '4px' }}
            >
              {cells.map((d, i) => {
                if (!d) return <Box key={`blank-${i}`} />;
                const look = dayLook(d);
                const isSelected = d.date === selected;
                const num = Number(d.date.slice(8));
                return (
                  <Box
                    key={d.date}
                    role="gridcell"
                    tabIndex={0}
                    aria-selected={isSelected}
                    aria-label={`${formatDate(d.date)}: ${look.text}${d.late ? ', late' : ''}`}
                    onClick={() => setSelected(d.date)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(d.date); } }}
                    sx={{
                      position: 'relative', cursor: 'pointer', overflow: 'hidden', p: '4px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      border: isSelected ? '3px solid #000' : look.dashed ? '2px dashed #868e96' : '1px solid rgba(0,0,0,0.35)',
                      backgroundColor: look.bg || (look.muted ? 'action.hover' : 'background.paper'),
                      color: look.bg ? '#000' : look.muted ? 'text.secondary' : 'text.primary',
                      outline: d.date === todayIso && !isSelected ? '2px solid #1971c2' : 'none',
                      '&:hover': { filter: 'brightness(0.95)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 900, fontSize: '0.8rem', lineHeight: 1 }}>{num}</Typography>
                      {d.late && <Box component="span" title={`Late (after ${data.late_after})`} sx={{ fontSize: '0.6rem', fontWeight: 900, px: '3px', bgcolor: '#000', color: '#fff', lineHeight: 1.4 }}>LATE</Box>}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      {look.label && <Typography noWrap sx={{ fontWeight: 800, fontSize: '0.78rem', lineHeight: 1.15 }}>{look.label}</Typography>}
                      {look.sub && <Typography noWrap sx={{ fontSize: '0.64rem', lineHeight: 1.1, opacity: 0.85 }}>{look.sub}</Typography>}
                    </Box>
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
              {LEGEND.map(([name, color]) => (
                <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: color, border: '1px solid rgba(0,0,0,0.5)' }} />
                  <Typography variant="caption">{name}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Paper className="brutal-border" sx={{ p: 1.5 }}>
            <Typography variant="overline" sx={{ fontWeight: 900 }}>This month</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography sx={{ fontWeight: 900, fontSize: '1.4rem' }}>{hm(s.hours)}</Typography>
              <Typography variant="body2" color="text.secondary">of {hm(s.expected_hours)} expected{s.hours_pct != null ? ` · ${s.hours_pct}%` : ''}</Typography>
            </Box>
            <LinearProgress variant="determinate" value={Math.min(s.hours_pct || 0, 100)} sx={{ height: 8, my: 0.75, '& .MuiLinearProgress-bar': { bgcolor: (s.hours_pct || 0) >= 95 ? '#2f9e44' : '#f08c00' } }} />
            <Stat label="Days present" value={`${s.present_days} of ${s.working_days}`} />
            <Stat label="Average per day" value={hm(s.avg_hours)} />
            <Stat label="Absent" value={s.absent_days} warn />
            <Stat label="On leave" value={s.leave_days} />
            <Stat label="Late arrivals" value={s.late_days} warn />
            <Stat label="Short on hours" value={s.short_days} warn />
            <Stat label="No clock-out" value={s.missing_clock_out_days} warn />
            {s.overtime_hours > 0 && <Stat label="Extra hours" value={hm(s.overtime_hours)} />}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Expected {hm(data.expected_hours)} a day{data.own_expected_hours ? ' (set for this person)' : ' (company default)'}
              </Typography>
              {canEditHours && <IconButton size="small" aria-label="Change expected hours" onClick={() => setEditing(true)}><EditIcon fontSize="small" /></IconButton>}
            </Box>

            <Box sx={{ borderTop: '2px solid #000', mt: 1, pt: 1 }} aria-live="polite">
              {day ? (
                <>
                  <Typography sx={{ fontWeight: 900 }}>{formatDate(day.date)} · {day.weekday}</Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>{dayLook(day).text}{day.late ? `. Late: first in after ${data.late_after}.` : ''}</Typography>
                  {day.kind === 'present' && (
                    <>
                      <Typography variant="body2">Worked <strong>{hm(day.hours)}</strong>{day.expected ? <> of {hm(day.expected)} expected</> : null}{day.work_mode ? ` · ${day.work_mode}` : ''}</Typography>
                      {day.logs.map((l, i) => (
                        <Typography key={i} variant="caption" sx={{ display: 'block' }}>
                          {formatTime(l.clock_in)} → {l.clock_out ? formatTime(l.clock_out) : '...'}
                        </Typography>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">Click a day for its details.</Typography>
              )}
            </Box>
          </Paper>
        </Box>
      )}

      {editing && data && (
        <ExpectedHoursDialog
          employee={{ id: data.employee.id, name: data.employee.name }}
          current={data.own_expected_hours}
          defaultHours={data.default_hours}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }}
        />
      )}
    </Box>
  );
};

export default MonthCalendar;
