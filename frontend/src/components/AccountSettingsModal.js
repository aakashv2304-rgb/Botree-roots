import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AccountSettingsModal = ({ open, onClose, user }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation don't match");
      return;
    }
    setLoading(true);
    try {
      await axios.patch(
        `${API}/users/me/password`,
        { current_password: currentPassword, new_password: newPassword },
        { withCredentials: true }
      );
      toast.success('Password updated successfully');
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="bg-[#FFFFFF] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1E1533]">Account Settings</DialogTitle>
        </DialogHeader>

        <div className="mb-4 pb-4 border-b border-[#E4DCF0]">
          <p className="text-sm font-semibold text-[#1E1533]">{user?.name}</p>
          <p className="text-xs text-[#8577A3]">{user?.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-sm font-bold text-[#1E1533]">Change Password</h3>

          <div className="space-y-2">
            <Label htmlFor="current_password">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              required
              data-testid="current-password-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              data-testid="new-password-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              data-testid="confirm-password-input"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="bg-[#FFFFFF] text-[#1E1533] border-[#E4DCF0] hover:bg-[#F1EBFA]">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' }}
              data-testid="save-password-button"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSettingsModal;
