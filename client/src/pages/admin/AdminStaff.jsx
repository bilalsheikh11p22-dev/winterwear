import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  Key,
  X,
  Clock,
  Activity,
} from 'lucide-react';

const AdminStaff = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'audit'
  const [staffList, setStaffList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toastMessage, setToastMessage] = useState('');

  // Create Staff Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'warehouse_staff',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [pendingRiders, setPendingRiders] = useState([]);
  const [reviewingId, setReviewingId] = useState(null);

  const fetchPendingRiders = useCallback(async () => {
    try {
      const res = await adminApi.getRiders({ status: 'pending' });
      setPendingRiders(res.data?.data || []);
    } catch (err) {
      console.error('[Rider Applications Error]', err);
    }
  }, []);

  useEffect(() => {
    fetchPendingRiders();
  }, [fetchPendingRiders]);

  const handleReviewRider = async (rider, action) => {
    let note = '';
    if (action === 'reject') {
      const input = window.prompt('Reason for rejection (optional):', '');
      if (input === null) return;
      note = input;
    }
    setReviewingId(rider._id);
    try {
      await adminApi.reviewRider(rider._id, { action, note });
      setToastMessage(`Rider ${action === 'approve' ? 'approved' : 'rejected'}: ${rider.name}`);
      setTimeout(() => setToastMessage(''), 3500);
      await fetchPendingRiders();
      if (typeof fetchStaff === 'function') fetchStaff();
    } catch (err) {
      setToastMessage(err.response?.data?.message || 'Could not update the application.');
      setTimeout(() => setToastMessage(''), 3500);
    } finally {
      setReviewingId(null);
    }
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        isStaff: 'true',
      };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const res = await adminApi.getUsers(params);
      setStaffList(res.data?.data || []);
      setTotalPages(res.data?.meta?.pages || 1);
    } catch (err) {
      console.error('[Staff Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 25,
      };
      if (search) params.search = search;

      const res = await adminApi.getAuditLogs(params);
      setAuditLogs(res.data?.data || []);
      setTotalPages(res.data?.meta?.pages || 1);
    } catch (err) {
      console.error('[Audit Logs Error]', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (activeTab === 'directory') {
      fetchStaff();
    } else {
      fetchAuditLogs();
    }
  }, [activeTab, fetchStaff, fetchAuditLogs]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await adminApi.createStaff(createForm);
      showToast(`Staff member '${createForm.name}' provisioned successfully.`);
      setIsCreateModalOpen(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'warehouse_staff',
      });
      fetchStaff();
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create staff account');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateRole = async (staffId, newRole) => {
    if (!isSuperAdmin) {
      alert('Only Super Administrators can modify role authorization levels.');
      return;
    }
    try {
      await adminApi.updateUserRole(staffId, newRole);
      showToast(`Role updated to ${newRole.replace(/_/g, ' ')}`);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Role change rejected');
    }
  };

  const handleToggleStatus = async (staffId, currentStatus) => {
    try {
      await adminApi.updateUserStatus(staffId, !currentStatus);
      showToast(`Staff account status updated.`);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Status change rejected');
    }
  };

  const ALL_ROLES = [
    'super_admin',
    'admin',
    'inventory_manager',
    'warehouse_staff',
    'rider',
    'fulfillment_staff',
    'customer_support',
    'finance_staff',
    'marketing_manager',
  ];

  const formatRole = (r) => {
    if (!r) return 'Staff';
    return r
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <AdminLayout
      title="Staff Directory & Immutable Audit Trails"
      subtitle="Role-based access management, staff provisioning and security audit logs"
    >
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-burgundy border border-white/20 text-snow px-4 py-2.5 rounded shadow-lg text-xs flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {pendingRiders.length > 0 && (
        <section className="mb-6 bg-amber-500/5 border border-amber-500/30 rounded-sm">
          <div className="px-4 py-3 border-b border-amber-500/20 flex items-center gap-2 text-xs uppercase tracking-widest text-amber-200 font-semibold">
            <Clock size={14} /> Rider applications waiting for confirmation ({pendingRiders.length})
          </div>
          <ul className="divide-y divide-white/5">
            {pendingRiders.map((r) => (
              <li key={r._id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 text-xs">
                  <p className="text-snow font-medium">{r.name}</p>
                  <p className="text-silver/80">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ''}
                  </p>
                  <p className="text-silver/60 capitalize">
                    {[r.riderProfile?.vehicleType, r.riderProfile?.city].filter(Boolean).join(' · ') || 'No details'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={reviewingId === r._id}
                    onClick={() => handleReviewRider(r, 'approve')}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] uppercase tracking-wider font-bold disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={reviewingId === r._id}
                    onClick={() => handleReviewRider(r, 'reject')}
                    className="px-3 py-1.5 rounded border border-red-500/40 text-red-300 hover:bg-red-500/10 text-[11px] uppercase tracking-wider disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Navigation Tabs Bar */}
      <div className="bg-[#17191C] border border-white/10 p-3 rounded-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('directory');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded transition uppercase tracking-wider font-medium ${
              activeTab === 'directory'
                ? 'bg-burgundy text-snow'
                : 'text-silver hover:text-snow hover:bg-white/5'
            }`}
          >
            <Users size={14} /> Staff Operations Directory
          </button>
          <button
            onClick={() => {
              setActiveTab('audit');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded transition uppercase tracking-wider font-medium ${
              activeTab === 'audit'
                ? 'bg-burgundy text-snow'
                : 'text-silver hover:text-snow hover:bg-white/5'
            }`}
          >
            <Activity size={14} /> System Audit Logs
          </button>
        </div>

        {activeTab === 'directory' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-burgundy hover:bg-burgundy/90 text-snow text-xs tracking-wider uppercase font-medium rounded transition"
          >
            <UserPlus size={14} /> Provision Staff
          </button>
        )}
      </div>

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4 text-xs">
          {/* Filter Bar */}
          <div className="bg-[#17191C] border border-white/10 p-3 rounded-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-silver"
                />
                <input
                  type="text"
                  placeholder="Search staff by name, email, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#1F2226] border border-white/10 rounded pl-9 pr-3 py-1.5 text-snow focus:outline-none focus:border-ice"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[#1F2226] border border-white/10 rounded px-3 py-1.5 text-snow focus:outline-none focus:border-ice"
              >
                <option value="">All Staff Roles</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {formatRole(r)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchStaff}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-silver hover:text-snow border border-white/10 rounded"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Directory Table */}
          <div className="bg-[#17191C] border border-white/10 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#1F2226] text-[10px] uppercase tracking-wider text-silver border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Joined Atelier</th>
                    <th className="py-3 px-4 text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-silver">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-silver/60">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-ice" />
                        Accessing staff registry...
                      </td>
                    </tr>
                  ) : staffList.length > 0 ? (
                    staffList.map((member) => {
                      const isSelf = member._id === currentUser?._id;

                      return (
                        <tr key={member._id} className="hover:bg-white/5 transition">
                          <td className="py-3 px-4">
                            <span className="font-serif text-snow font-medium block">
                              {member.name}
                            </span>
                            <span className="text-[10px] text-silver/70">{member.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            {isSuperAdmin && !isSelf ? (
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateRole(member._id, e.target.value)}
                                className="bg-[#1F2226] border border-white/10 rounded px-2 py-1 text-ice font-medium text-xs focus:outline-none"
                              >
                                {ALL_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {formatRole(r)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-white/5 text-ice border border-white/10">
                                {formatRole(member.role)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-silver/80 font-mono text-[11px]">
                            {member.phone || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                                member.isActive
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {member.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-silver/80">
                            {new Date(member.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isSelf ? (
                              <button
                                onClick={() => handleToggleStatus(member._id, member.isActive)}
                                className={`px-2.5 py-1 rounded text-[11px] transition border ${
                                  member.isActive
                                    ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                    : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                              >
                                {member.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            ) : (
                              <span className="text-silver/40 text-[11px]">Current Session</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-silver/60">
                        No staff members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-[#17191C] border border-white/10 rounded-sm overflow-hidden text-xs">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-serif text-snow tracking-wider uppercase font-medium">
                Security Audit Log
              </h3>
              <p className="text-xs text-silver/70">
                Immutable record of administrative interventions, stock changes, and role assignments
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-silver border border-white/10 rounded"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#1F2226] text-[10px] uppercase tracking-wider text-silver border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Model</th>
                  <th className="py-3 px-4">Audit Details</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-silver">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-silver/60">
                      Loading audit events...
                    </td>
                  </tr>
                ) : auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-white/5">
                      <td className="py-3 px-4 text-silver/80">
                        {new Date(log.createdAt).toLocaleString('en-PK', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                      <td className="py-3 px-4 text-snow">
                        <span className="font-medium block">{log.actorEmail}</span>
                        <span className="text-[10px] text-ice uppercase">{log.actorRole}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-white/5 text-snow">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-silver">{log.targetModel}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-silver/80 truncate max-w-[240px]">
                        {JSON.stringify(log.details)}
                      </td>
                      <td className="py-3 px-4 font-mono text-silver/60">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-silver/60">
                      No security audit events recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROVISION STAFF MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#17191C] border border-white/15 rounded-sm max-w-md w-full shadow-2xl text-xs">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-serif text-snow uppercase tracking-wider font-medium">
                Provision New Staff Account
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-silver hover:text-snow"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-5 space-y-3">
              {createError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded text-xs">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-silver mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                />
              </div>

              <div>
                <label className="block text-silver mb-1">Work Email Address *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="tariq@winterwear.pk"
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                />
              </div>

              <div>
                <label className="block text-silver mb-1">Phone Number</label>
                <input
                  type="text"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+92 300 1234567"
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                />
              </div>

              <div>
                <label className="block text-silver mb-1">Assigned Operational Role *</label>
                <select
                  required
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {formatRole(r)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-silver mb-1">Initial Password * (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-white/20 text-snow rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 bg-burgundy hover:bg-burgundy/90 text-snow uppercase tracking-wider text-[11px] font-medium rounded transition"
                >
                  {createLoading ? 'Provisioning...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminStaff;
