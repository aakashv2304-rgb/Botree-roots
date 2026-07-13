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
import { Plus, Trash2, Edit } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '', name: '', role: 'Sales' });

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchUsers();
    }
  }, [user]);

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
      setFormData({ email: '', password: '', name: '', role: 'Sales' });
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
      <div className="p-8">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">Access denied. Only Admin can manage users.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066CC]"></div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="users-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage system users and roles</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-user-button" className="bg-[#0066CC] hover:bg-[#0052A3] text-white">
              <Plus size={20} className="mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create New User</DialogTitle>
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
              <Button type="submit" data-testid="submit-user-button" className="w-full bg-[#0066CC] hover:bg-[#0052A3] text-white">
                Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr className="text-left">
                <th className="p-4 text-xs uppercase tracking-wider text-gray-600 font-semibold">Name</th>
                <th className="p-4 text-xs uppercase tracking-wider text-gray-600 font-semibold">Email</th>
                <th className="p-4 text-xs uppercase tracking-wider text-gray-600 font-semibold">Role</th>
                <th className="p-4 text-xs uppercase tracking-wider text-gray-600 font-semibold">Created</th>
                <th className="p-4 text-xs uppercase tracking-wider text-gray-600 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} data-testid={`user-row-${u.id}`} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{u.name}</td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4">
                    <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-50 text-[#0066CC] border border-blue-200 rounded-full">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
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
                        className="border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        <Edit size={16} />
                      </Button>
                      {u.id !== user.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`delete-user-${u.id}`}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
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
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Change User Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">User: <span className="font-semibold text-gray-900">{selectedUser?.name}</span></p>
              <p className="text-sm text-gray-600">Email: <span className="font-semibold text-gray-900">{selectedUser?.email}</span></p>
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
              <Button onClick={handleRoleChange} className="flex-1 bg-[#0066CC] hover:bg-[#0052A3]">
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
