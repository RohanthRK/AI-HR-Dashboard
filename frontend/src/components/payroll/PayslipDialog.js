import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import api from '../../services/api';
import { formatMoney, formatDate } from '../../utils/format';

const Row = ({ label, value, bold }) => (
  <TableRow>
    <TableCell sx={{ border: 0, py: 0.5, fontWeight: bold ? 800 : 400 }}>{label}</TableCell>
    <TableCell align="right" sx={{ border: 0, py: 0.5, fontWeight: bold ? 800 : 400 }}>{value}</TableCell>
  </TableRow>
);

const Info = ({ label, value }) => (
  <Box sx={{ minWidth: 150 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>{value || '-'}</Typography>
  </Box>
);

export const downloadPayslipPdf = async (slip) => {
  const res = await api.get(`/api/payroll/payslip/${slip._id}/pdf/`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslip-${slip.employee_code || ''}-${(slip.period || '').replace(/\s+/g, '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

/** One payslip on screen, laid out like the printed one: employee details, earnings, deductions, net pay in words and year-to-date. */
const PayslipDialog = ({ slipId, onClose }) => {
  const [slip, setSlip] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSlip(null);
    setError(null);
    if (!slipId) return;
    api.get(`/api/payroll/payslip/${slipId}/`).then((r) => setSlip(r.data.payslip)).catch(() => setError('Could not load this payslip.'));
  }, [slipId]);

  const earnings = slip ? [['Basic', slip.basic], ['House rent allowance', slip.hra], ['Special allowance', slip.special_allowance ?? slip.allowances]] : [];
  const deductions = slip ? [['Provident fund', slip.provident_fund], ['ESI', slip.esi || 0], ['Professional tax', slip.professional_tax || 0], ['Income tax (TDS)', slip.tax]] : [];
  if (slip) {
    if (slip.overtime_pay) earnings.push(['Overtime', slip.overtime_pay]);
    (slip.pay_items || []).forEach((i) => (i.kind === 'benefit' ? earnings : deductions).push([i.name, i.amount]));
    (slip.adjustments || []).forEach((i) => (i.kind === 'earning' ? earnings : deductions).push([`${i.name} (this month)`, i.amount]));
  }
  const shownDeductions = deductions.filter(([name, amount]) => amount || name === 'Provident fund' || name === 'Income tax (TDS)');

  return (
    <Dialog open={!!slipId} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{slip ? `${slip.company} — payslip for ${slip.period}` : 'Payslip'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        {!slip && !error && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
        {slip && (
          <Box>
            {slip.status === 'Draft' && <Alert severity="info" sx={{ mb: 2 }}>Draft: only HR can see this payslip until it is released.</Alert>}
            <Typography variant="h6">{slip.employee_name}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, my: 2 }}>
              <Info label="Employee ID" value={slip.employee_code} />
              <Info label="Designation" value={slip.designation} />
              <Info label="Department" value={slip.department} />
              <Info label="Date of joining" value={slip.date_of_joining ? formatDate(slip.date_of_joining) : ''} />
              <Info label="PAN" value={slip.pan_masked} />
              <Info label="UAN" value={slip.uan} />
              <Info label="Bank account" value={slip.bank_name ? `${slip.bank_name} ${slip.bank_account_masked}` : ''} />
              <Info label="Days paid" value={`${slip.paid_days} of ${slip.working_days} working days${slip.lop_days ? ` (loss of pay ${slip.lop_days})` : ''}`} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Box sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={{ fontWeight: 800 }}>Earnings</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>₹</TableCell></TableRow></TableHead>
                  <TableBody>{earnings.map(([n, a], i) => <Row key={i} label={n} value={formatMoney(a)} />)}<Row label="Gross earnings" value={formatMoney(slip.gross_salary)} bold /></TableBody>
                </Table>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={{ fontWeight: 800 }}>Deductions</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>₹</TableCell></TableRow></TableHead>
                  <TableBody>{shownDeductions.map(([n, a], i) => <Row key={i} label={n} value={formatMoney(a)} />)}<Row label="Total deductions" value={formatMoney(slip.total_deductions)} bold /></TableBody>
                </Table>
              </Box>
            </Box>
            <Box sx={{ mt: 2, p: 2, border: '2px solid', borderColor: 'text.primary' }}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>Net pay {formatMoney(slip.net_salary)}</Typography>
              <Typography variant="body2">{slip.amount_in_words}</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>YEAR TO DATE (APRIL ONWARDS)</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
              <Info label="Gross earnings" value={formatMoney(slip.ytd.earnings)} />
              <Info label="Provident fund" value={formatMoney(slip.ytd.provident_fund)} />
              <Info label="Income tax (TDS)" value={formatMoney(slip.ytd.tax)} />
              <Info label="Net pay" value={formatMoney(slip.ytd.net)} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Your employer also contributes {formatMoney(slip.employer_pf)} to your provident fund{slip.employer_esi ? ` and ${formatMoney(slip.employer_esi)} to ESI` : ''} each month. Income tax is calculated under the new tax regime.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {slip && <Button startIcon={<GetAppIcon />} onClick={() => downloadPayslipPdf(slip)}>Download PDF</Button>}
        <Button variant="contained" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PayslipDialog;
