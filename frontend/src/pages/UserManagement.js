import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash, PencilSimple, Upload, FileText } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '', name: '', role: 'Sales', department: 'Sales' });
  const [baseTemplate, setBaseTemplate] = useState(null);
  const [templateUploading, setTemplateUploading] = useState(false);

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchUsers();
      fetchBaseTemplate();
    }
  }, [user]);

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
      setFormData({ email: '', password: '', name: '', role: 'Sales', department: 'Sales' });
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

  if (user?.role !== 'Admin') {
    return (
      <div className="p-6">
        <div className="bg-[#1E1533] border border-[#3D2A5C] rounded-lg p-6 text-center">
          <p className="text-[#9E8FC2]">Access denied. Only Admin can manage users.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-12 border-t-2 border-b-2 border-[#9B30FF]"></div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="users-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-black text-[#F5F3FA] mb-2">User Management</h1>
          <p className="text-[#9E8FC2] font-body">Manage system users and roles</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-user-button" className="text-white font-semibold shadow-md" style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}>
              <Plus size={20} className="mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1E1533]">
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
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  data-testid="user-password-input"
                />
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
                <Label htmlFor="department">Department <span className="text-red-400">*</span></Label>
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
      <div className="bg-[#1E1533] border border-[#3D2A5C] rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-[#F5F3FA] mb-1">Base Proposal Template</h2>
        <p className="text-sm text-[#9E8FC2] mb-4">
          Every new proposal that doesn't have its own document attached automatically uses this .docx as its base -
          the commercial fields Sales enters get filled into its Fees tables (Table B.1/B.2) with nothing else changed.
        </p>
        <div className="flex items-center gap-4">
          <label
            htmlFor="base-template-file"
            className="flex items-center gap-2 px-4 py-2 border border-[#3D2A5C] rounded hover:bg-[#2A1F45] cursor-pointer transition-colors"
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
            <span className="flex items-center gap-2 text-sm text-[#B9AED4]">
              <FileText size={16} className="text-purple-400" />
              {baseTemplate.filename}
              <span className="text-[#8B7FAE] text-xs">
                (updated {new Date(baseTemplate.updated_at).toLocaleDateString()})
              </span>
            </span>
          ) : (
            <span className="text-sm text-amber-400">No base template configured yet</span>
          )}
        </div>
      </div>

      <div className="bg-[#1E1533] border border-[#3D2A5C] rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[#3D2A5C] bg-[#150E29]">
              <tr className="text-left">
                <th className="p-4 text-xs uppercase tracking-wider text-[#9E8FC2] font-semibold">Name</th>
                <th className="p-4 text-xs uppercase tracking-wider text-[#9E8FC2] font-semibold">Email</th>
                <th className="p-4 text-xs uppercase tracking-wider text-[#9E8FC2] font-semibold">Role</th>
                <th className="p-4 text-xs uppercase tracking-wider text-[#9E8FC2] font-semibold">Department</th>
                <th className="p-4 text-xs uppercase tracking-wider text-[#9E8FC2] font-semibold">Created</th>
                <th className="p-4 text-xs uppercase tracking-wider text-[#9E8FC2] font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3D2A5C]">
              {users.map((u) => (
                <tr key={u.id} data-testid={`user-row-${u.id}`} className="hover:bg-[#2A1F45] transition-colors">
                  <td className="p-4 font-medium text-[#F5F3FA]">{u.name}</td>
                  <td className="p-4 text-[#9E8FC2]">{u.email}</td>
                  <td className="p-4">
                    <span className="inline-block px-3 py-1 text-xs font-medium text-white rounded-full" style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="inline-block px-3 py-1 text-xs font-medium bg-[#241A3D] text-[#B9AED4] rounded-full">
                      {u.department || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4 text-[#9E8FC2] text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
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
                        className="border-[#3D2A5C] text-[#B9AED4] hover:bg-[#2A1F45]"
                      >
                        <PencilSimple size={16} />
                      </Button>
                      {u.id !== user.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`delete-user-${u.id}`}
                              className="border-red-500/40 text-red-400 hover:bg-red-500/15"
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
        <DialogContent className="bg-[#1E1533]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Change User Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#9E8FC2] mb-2">User: <span className="font-semibold text-[#F5F3FA]">{selectedUser?.name}</span></p>
              <p className="text-sm text-[#9E8FC2]">Email: <span className="font-semibold text-[#F5F3FA]">{selectedUser?.email}</span></p>
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
    </div>
  );
};

export default UserManagement;
