import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash, PencilSimple, Upload, FileText, Key, Check, X, UserCirclePlus } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', name: '', role: 'Sales', department: 'Sales' });
  const [baseTemplate, setBaseTemplate] = useState(null);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [accessRequests, setAccessRequests] = useState([]);
  const [approveOpen, setApproveOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approveRole, setApproveRole] = useState('Sales');
  const [approveDepartment, setApproveDepartment] = useState('Sales');
  const [approveLoading, setApproveLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchUsers();
      fetchBaseTemplate();
      fetchAccessRequests();
    }
  }, [user]);

  const fetchAccessRequests = async () => {
    try {
      const { data } = await axios.get(`${API}/access-requests`, { withCredentials: true });
      setAccessRequests(data);
    } catch (error) {
      // non-fatal
    }
  };

  const openApproveDialog = (req) => {
    setSelectedRequest(req);
    setApproveRole('Sales');
    setApproveDepartment('Sales');
    setApproveOpen(true);
  };

  const handleApproveRequest = async () => {
    setApproveLoading(true);
    try {
      await axios.post(
        `${API}/access-requests/${selectedRequest.id}/approve`,
        { role: approveRole, department: approveDepartment },
        { withCredentials: true }
      );
      toast.success(`${selectedRequest.name} approved as ${approveRole}`);
      setApproveOpen(false);
      setSelectedRequest(null);
      fetchAccessRequests();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve access request');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleRejectRequest = async (req) => {
    if (!window.confirm(`Decline access for ${req.name} (${req.email})?`)) return;
    try {
      await axios.post(`${API}/access-requests/${req.id}/reject`, {}, { withCredentials: true });
      toast.success('Access request declined');
      fetchAccessRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to decline access request');
    }
  };

  const fetchBaseTemplate = async () => {
    try {
      const { data } = await axios.get(`${API}/base-template`, { withCredentials: true });
      setBaseTemplate(data);
    } catch (error) {
      // non-fatal - template management just won't show current status
    }
  };

  const handleBaseTemplateUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Base template must be a .docx file');
      return;
    }
    setTemplateUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post(`${API}/base-template/upload`, fd, { withCredentials: true });
      toast.success('Base proposal template updated');
      setBaseTemplate({ configured: true, filename: data.filename, updated_at: data.updated_at });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload base template');
    } finally {
      setTemplateUploading(false);
      e.target.value = '';
    }
  };

  const [migratingDomain, setMigratingDomain] = useState(false);
  const handleMigrateEmailDomain = async () => {
    if (!window.confirm('Update any user accounts still on @botree.co.in to @botree.ai?')) return;
    setMigratingDomain(true);
    try {
      const { data } = await axios.post(`${API}/admin/migrate-email-domain`, {}, { withCredentials: true });
      toast.success(data.message);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Migration failed');
    } finally {
      setMigratingDomain(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${API}/users`, { withCredentials: true });
      setUsers(data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/users`, formData, { withCredentials: true });
      toast.success('User created successfully');
      setOpen(false);
      setFormData({ email: '', name: '', role: 'Sales', department: 'Sales' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleDelete = async (userId) => {
    try {
      await axios.delete(`${API}/users/${userId}`, { withCredentials: true });
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleRoleChange = async () => {
    try {
      await axios.put(`${API}/users/${selectedUser.id}/role?role=${newRole}`, {}, { withCredentials: true });
      toast.success('Role updated successfully');
      setEditRoleOpen(false);
      setSelectedUser(null);
      setNewRole('');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleResetPassword = async () => {
    setResetPasswordLoading(true);
    try {
      const { data } = await axios.patch(
        `${API}/users/${selectedUser.id}/password`,
        { new_password: resetPasswordValue || undefined },
        { withCredentials: true }
      );
      toast.success(`Password reset for ${selectedUser.name} (${data.new_password})`);
      setResetPasswordOpen(false);
      setSelectedUser(null);
      setResetPasswordValue('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="p-6">
        <div className="bg-[#FFFFFF] border border-[#E4DCF0] rounded-lg p-6 text-center">
          <p className="text-[#7A6B9E]">Access denied. Only Admin can manage users.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner fullScreen label="Loading users..." />
  }

  return (
    <div className="p-6" data-testid="users-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-black text-[#1E1533] mb-2">User Management</h1>
          <p className="text-[#7A6B9E] font-body">Manage system users and roles</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-user-button" className="text-white font-semibold shadow-md" style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}>
              <Plus size={20} className="mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FFFFFF] text-[#1E1533]">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading font-bold">Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-user-form">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="user-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="user-email-input"
                />
              </div>
              <div className="p-3 bg-[#F1EBFA] border border-[#E4DCF0] rounded text-xs text-[#5B4B7A]">
                New users are created with the standard password <strong>Botree@123</strong>. They can change it anytime from Account Settings.
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger data-testid="user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="CGO">CGO</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="CFO">CFO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department <span className="text-red-700">*</span></Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })} required>
                  <SelectTrigger data-testid="user-department-select">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="CGO">CGO</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="CFO">CFO</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" data-testid="submit-user-button" className="w-full text-white font-semibold shadow-md" style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}>
                Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Base Proposal Template */}
      <div className="bg-[#FFFFFF] border border-[#E4DCF0] rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-[#1E1533] mb-1">Base Proposal Template</h2>
        <p className="text-sm text-[#7A6B9E] mb-4">
          Every new proposal that doesn't have its own document attached automatically uses this .docx as its base -
          the commercial fields Sales enters get filled into its Fees tables (Table B.1/B.2) with nothing else changed.
        </p>
        <div className="flex items-center gap-4">
          <label
            htmlFor="base-template-file"
            className="flex items-center gap-2 px-4 py-2 border border-[#E4DCF0] rounded hover:bg-[#EDE4F9] cursor-pointer transition-colors"
          >
            <Upload size={18} />
            <span className="text-sm">{templateUploading ? 'Uploading...' : 'Upload / Replace'}</span>
          </label>
          <input
            id="base-template-file"
            type="file"
            accept=".docx"
            onChange={handleBaseTemplateUpload}
            disabled={templateUploading}
            className="hidden"
          />
          {baseTemplate?.configured ? (
            <span className="flex items-center gap-2 text-sm text-[#5B4B7A]">
              <FileText size={16} className="text-purple-700" />
              {baseTemplate.filename}
              <span className="text-[#8577A3] text-xs">
                (updated {new Date(baseTemplate.updated_at).toLocaleDateString()})
              </span>
            </span>
          ) : (
            <span className="text-sm text-amber-700">No base template configured yet</span>
          )}
        </div>
      </div>

      {/* Account Maintenance */}
      <div className="bg-[#FFFFFF] border border-[#E4DCF0] rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-[#1E1533] mb-1">Account Maintenance</h2>
        <p className="text-sm text-[#7A6B9E] mb-4">
          One-time cleanup: update any user still on the old @botree.co.in email domain to the current @botree.ai.
        </p>
        <Button
          onClick={handleMigrateEmailDomain}
          disabled={migratingDomain}
          variant="outline"
          data-testid="migrate-email-domain-button"
        >
          {migratingDomain ? 'Updating...' : 'Migrate botree.co.in → botree.ai'}
        </Button>
      </div>

      {/* Pending Access Requests (Zoho SSO) */}
      {accessRequests.length > 0 && (
        <div className="bg-[#FFFFFF] border border-amber-300 rounded-lg shadow-sm p-6 mb-6" data-testid="access-requests-section">
          <h2 className="text-lg font-bold text-[#1E1533] mb-1 flex items-center gap-2">
            <UserCirclePlus size={22} className="text-amber-600" />
            Pending Access Requests
            <span className="text-xs font-semibold text-white bg-amber-500 rounded-full px-2 py-0.5">{accessRequests.length}</span>
          </h2>
          <p className="text-sm text-[#7A6B9E] mb-4">
            These people signed in with Zoho but don't have a Botree Roots account yet. Approve to assign them a role, or decline.
          </p>
          <div className="space-y-2">
            {accessRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3" data-testid={`access-request-${req.id}`}>
                <div>
                  <p className="font-semibold text-[#1E1533]">{req.name}</p>
                  <p className="text-sm text-[#7A6B9E]">{req.email}</p>
                  <p className="text-xs text-[#8577A3]">Requested {new Date(req.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => openApproveDialog(req)}
                    data-testid={`approve-request-${req.id}`}
                    className="text-white font-semibold"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  >
                    <Check size={16} className="mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectRequest(req)}
                    data-testid={`reject-request-${req.id}`}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <X size={16} className="mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#FFFFFF] border border-[#E4DCF0] rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[#E4DCF0] bg-[#F7F4FC]">
              <tr className="text-left">
                <th className="p-4 text-xs uppercase tracking-wider text-[#7A6B9E] font-semibold">Name</th>
                <th className="p-4 text-xs uppercase tracking-wider text-[#7A6B9E] font-semibold">Email</th>
                <th className="p-4 text-xs uppercase tracking-wider text-[#7A6B9E] font-semibold">Role</th>
                <th className="p-4 text-xs uppercase tracking-wider text-[#7A6B9E] font-semibold">Department</th>
                <th className="p-4 text-xs uppercase tracking-wider text-[#7A6B9E] font-semibold">Created</th>
                <th className="p-4 text-xs uppercase tracking-wider text-[#7A6B9E] font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4DCF0]">
              {users.map((u) => (
                <tr key={u.id} data-testid={`user-row-${u.id}`} className="hover:bg-[#EDE4F9] transition-colors">
                  <td className="p-4 font-medium text-[#1E1533]">{u.name}</td>
                  <td className="p-4 text-[#7A6B9E]">{u.email}</td>
                  <td className="p-4">
                    <span className="inline-block px-3 py-1 text-xs font-medium text-white rounded-full" style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="inline-block px-3 py-1 text-xs font-medium bg-[#F1EBFA] text-[#5B4B7A] rounded-full">
                      {u.department || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4 text-[#7A6B9E] text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(u);
                          setNewRole(u.role);
                          setEditRoleOpen(true);
                        }}
                        data-testid={`edit-role-${u.id}`}
                        className="border-[#E4DCF0] text-[#5B4B7A] hover:bg-[#EDE4F9]"
                      >
                        <PencilSimple size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(u);
                          setResetPasswordOpen(true);
                        }}
                        data-testid={`reset-password-${u.id}`}
                        className="border-[#E4DCF0] text-[#5B4B7A] hover:bg-[#EDE4F9]"
                        title="Reset password"
                      >
                        <Key size={16} />
                      </Button>
                      {u.id !== user.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`delete-user-${u.id}`}
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <Trash size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {u.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(u.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent className="bg-[#FFFFFF] text-[#1E1533]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Change User Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#7A6B9E] mb-2">User: <span className="font-semibold text-[#1E1533]">{selectedUser?.name}</span></p>
              <p className="text-sm text-[#7A6B9E]">Email: <span className="font-semibold text-[#1E1533]">{selectedUser?.email}</span></p>
            </div>
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="CGO">CGO</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
                  <SelectItem value="CFO">CFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditRoleOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleRoleChange} className="flex-1 text-white font-semibold shadow-md" style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}>
                Update Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordOpen} onOpenChange={(o) => { setResetPasswordOpen(o); if (!o) setResetPasswordValue(''); }}>
        <DialogContent className="bg-[#FFFFFF] text-[#1E1533]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#7A6B9E] mb-2">User: <span className="font-semibold text-[#1E1533]">{selectedUser?.name}</span></p>
              <p className="text-sm text-[#7A6B9E]">Email: <span className="font-semibold text-[#1E1533]">{selectedUser?.email}</span></p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset_password_value">New Password (optional)</Label>
              <Input
                id="reset_password_value"
                type="text"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="Leave blank to reset to Botree@123"
                data-testid="reset-password-input"
              />
              <p className="text-xs text-[#8577A3]">Leave this blank to reset the user back to the standard password, Botree@123.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setResetPasswordOpen(false)} className="flex-1 bg-[#FFFFFF] text-[#1E1533] border-[#E4DCF0] hover:bg-[#F1EBFA]">
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={resetPasswordLoading}
                className="flex-1 text-white font-semibold shadow-md"
                style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}
                data-testid="confirm-reset-password-button"
              >
                {resetPasswordLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="bg-[#FFFFFF] text-[#1E1533]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Approve Access Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#7A6B9E] mb-2">Name: <span className="font-semibold text-[#1E1533]">{selectedRequest?.name}</span></p>
              <p className="text-sm text-[#7A6B9E]">Email: <span className="font-semibold text-[#1E1533]">{selectedRequest?.email}</span></p>
            </div>
            <div className="space-y-2">
              <Label>Assign Role</Label>
              <Select value={approveRole} onValueChange={setApproveRole}>
                <SelectTrigger data-testid="approve-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="CGO">CGO</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
                  <SelectItem value="CFO">CFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign Department</Label>
              <Select value={approveDepartment} onValueChange={setApproveDepartment}>
                <SelectTrigger data-testid="approve-department-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="CGO">CGO</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
                  <SelectItem value="CFO">CFO</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setApproveOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleApproveRequest}
                disabled={approveLoading}
                className="flex-1 text-white font-semibold shadow-md"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                data-testid="confirm-approve-button"
              >
                {approveLoading ? 'Approving...' : 'Approve & Grant Access'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
