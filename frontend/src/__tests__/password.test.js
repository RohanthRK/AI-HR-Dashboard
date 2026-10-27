import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChangePasswordDialog from '../components/auth/ChangePasswordDialog';
import authService from '../services/authService';

vi.mock('../services/authService', () => ({ __esModule: true, default: { changePassword: vi.fn() } }));

const fill = (label, value) => fireEvent.change(screen.getByLabelText(new RegExp('^' + label)), { target: { value } });

describe('ChangePasswordDialog', () => {
  beforeEach(() => authService.changePassword.mockReset());

  it('checks the new password before calling the server', async () => {
    render(<ChangePasswordDialog open onClose={() => {}} />);
    fill('Current password', 'Old#Pass1');
    fill('New password', 'short');
    fill('Confirm new password', 'short');
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText(/at least 8 characters/)).toBeInTheDocument();
    fill('New password', 'LongEnough#1');
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText(/do not match/)).toBeInTheDocument();
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('shows the server message when the current password is wrong, and success otherwise', async () => {
    authService.changePassword.mockRejectedValueOnce({ response: { data: { message: 'Current password is incorrect' } } });
    render(<ChangePasswordDialog open onClose={() => {}} />);
    fill('Current password', 'Wrong#Pass1');
    fill('New password', 'Brand#New2026');
    fill('Confirm new password', 'Brand#New2026');
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument();

    authService.changePassword.mockResolvedValueOnce({ success: true });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(screen.getByText(/Your password was changed/)).toBeInTheDocument());
    expect(authService.changePassword).toHaveBeenLastCalledWith({ current_password: 'Wrong#Pass1', new_password: 'Brand#New2026' });
  });
});
