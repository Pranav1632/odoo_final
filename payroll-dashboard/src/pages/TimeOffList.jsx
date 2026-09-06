// src/pages/TimeOffList.jsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Select, Input, 
  Table, Avatar, Pagination, Breadcrumb, Modal 
} from '../components/UI';
import { formatDate, getStatusColor } from '../lib/formatters';
import { getSession } from '../lib/user';
import { timeoffApi, employeesApi } from '../lib/api';

export function TimeOffList() {
  const navigate = useNavigate();
  const session = getSession();
  const isEmployee = session?.role === 'EMPLOYEE';
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialTab = searchParams.get('tab') || 'requests';
  const [currentTab, setCurrentTab] = useState(initialTab);

  const [requestsList, setRequestsList] = useState([]);
  const [allocationsList, setAllocationsList] = useState([]);
  const [typesList, setTypesList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync tab with URL searchParams
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== currentTab) {
      setCurrentTab(tab);
    }
  }, [searchParams]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      timeoffApi.getRequests().catch(() => []),
      timeoffApi.getAllocations().catch(() => []),
      timeoffApi.getTypes().catch(() => []),
      employeesApi.getAll().catch(() => []),
    ]).then(([reqData, allocData, typeData, empData]) => {
      if (Array.isArray(reqData)) {
        let reqs = reqData;
        if (isEmployee && session?.employeeId) {
          reqs = reqs.filter(r => r.employeeId === session.employeeId);
        }
        setRequestsList(reqs.map(r => ({
          id: r.id,
          employeeId: r.employeeId,
          employeeName: r.employee?.name || 'Employee',
          leaveTypeId: r.typeId,
          leaveTypeName: r.type?.name || 'Time Off',
          fromDate: r.startDate ? r.startDate.split('T')[0] : '',
          toDate: r.endDate ? r.endDate.split('T')[0] : '',
          duration: `${r.duration} day${r.duration > 1 ? 's' : ''}`,
          reason: 'Leave Request',
          status: r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase() : 'Pending',
          requestedOn: r.createdAt ? r.createdAt.split('T')[0] : 'Recent',
        })));
      }
      if (Array.isArray(allocData)) {
        let allocs = allocData;
        if (isEmployee && session?.employeeId) {
          allocs = allocs.filter(a => a.employeeId === session.employeeId);
        }
        setAllocationsList(allocs.map(a => ({
          id: a.id,
          employeeId: a.employeeId,
          employeeName: a.employee?.name || 'Employee',
          leaveTypeId: a.typeId,
          leaveTypeName: a.type?.name || 'Time Off',
          allocated: a.allocated,
          taken: a.taken,
          remaining: a.allocated - a.taken,
          approved: a.approved,
          status: a.approved ? 'Approved' : 'Pending',
        })));
      }
      if (Array.isArray(typeData)) {
        setTypesList(typeData.map(t => ({
          id: t.id,
          name: t.name,
          color: '#4F46E5',
          unit: t.unit,
        })));
      }
      if (Array.isArray(empData)) {
        setEmployeesList(empData);
        if (empData.length > 0 && !newReqEmployee) {
          const defaultEmp = session?.employeeId && empData.some(e => e.id === session.employeeId)
            ? session.employeeId
            : empData[0].id;
          setNewReqEmployee(defaultEmp);
        }
      }
      if (Array.isArray(typeData) && typeData.length > 0 && !newReqType) {
        setNewReqType(typeData[0].id);
      }
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filters
  const employeeParam = searchParams.get('employeeId') || searchParams.get('employee') || 'all';
  const [employeeFilter, setEmployeeFilter] = useState(employeeParam);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Request Modal State
  const [newRequestModal, setNewRequestModal] = useState(false);
  const [newReqEmployee, setNewReqEmployee] = useState('');
  const [newReqType, setNewReqType] = useState('');
  const [newReqStart, setNewReqStart] = useState('');
  const [newReqEnd, setNewReqEnd] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [modalError, setModalError] = useState('');

  // Auto-calculated duration in days
  const calculatedDuration = useMemo(() => {
    if (!newReqStart || !newReqEnd) return 1;
    const start = new Date(newReqStart);
    const end = new Date(newReqEnd);
    const diffTime = end - start;
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }, [newReqStart, newReqEnd]);

  const handleApproveRequest = async (reqId) => {
    try {
      await timeoffApi.approveRequest(reqId);
      loadData();
    } catch (err) {
      console.warn('API approve failed:', err);
      alert(err.message || 'Failed to approve request');
    }
  };

  const handleRefuseRequest = async (reqId) => {
    try {
      await timeoffApi.refuseRequest(reqId);
      loadData();
    } catch (err) {
      console.warn('API refuse failed:', err);
      alert(err.message || 'Failed to refuse request');
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!newReqEmployee || !newReqType || !newReqStart || !newReqEnd) {
      setModalError('All fields are required.');
      return;
    }
    if (new Date(newReqEnd) < new Date(newReqStart)) {
      setModalError('End date cannot be before start date.');
      return;
    }

    setSubmittingReq(true);
    try {
      await timeoffApi.createRequest({
        employeeId: newReqEmployee,
        typeId: newReqType,
        startDate: newReqStart,
        endDate: newReqEnd,
        duration: calculatedDuration,
      });
      setNewRequestModal(false);
      loadData();
    } catch (err) {
      setModalError(err.message || 'Failed to submit time off request');
    } finally {
      setSubmittingReq(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requestsList.filter(req => {
      const matchesSearch = !search || 
        (req.employeeName && req.employeeName.toLowerCase().includes(search.toLowerCase())) ||
        (req.leaveTypeName && req.leaveTypeName.toLowerCase().includes(search.toLowerCase()));
      const matchesEmp = employeeFilter === 'all' || req.employeeId === employeeFilter;
      const matchesStatus = statusFilter === 'all' || req.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesEmp && matchesStatus;
    });
  }, [requestsList, search, employeeFilter, statusFilter]);

  const filteredAllocations = useMemo(() => {
    return allocationsList.filter(alloc => {
      const matchesEmp = employeeFilter === 'all' || alloc.employeeId === employeeFilter;
      return matchesEmp;
    });
  }, [allocationsList, employeeFilter]);

  const requestColumns = [
    { key: 'employee', header: 'Employee', width: '200px', render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.employeeName} size="sm" />
        <span className="font-semibold text-gray-900">{row.employeeName}</span>
      </div>
    )},
    { key: 'type', header: 'Type', width: '150px', render: (row) => (
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent-500"></span>
        <span className="text-sm font-medium text-gray-800">{row.leaveTypeName}</span>
      </span>
    )},
    { key: 'from', header: 'From', width: '110px', render: (row) => formatDate(row.fromDate) },
    { key: 'to', header: 'To', width: '110px', render: (row) => formatDate(row.toDate) },
    { key: 'duration', header: 'Duration', width: '100px', render: (row) => <span className="font-medium text-gray-900">{row.duration}</span> },
    { key: 'status', header: 'Status', width: '110px', render: (row) => (
      <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
    )},
    { key: 'actions', header: 'Actions', width: '160px', render: (row) => {
      const canApprove = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(session?.role)
        && row.employeeId !== session?.employeeId;
      return (
        <div className="flex items-center gap-1">
          {row.status === 'Pending' && canApprove ? (
            <>
              <Button variant="success" size="sm" onClick={() => handleApproveRequest(row.id)}>Approve</Button>
              <Button variant="danger" size="sm" onClick={() => handleRefuseRequest(row.id)}>Refuse</Button>
            </>
          ) : (
            <span className="text-xs text-gray-400">{row.status === 'Pending' ? 'Awaiting approval' : 'Processed'}</span>
          )}
        </div>
      );
    }},
  ];

  const allocationColumns = [
    { key: 'employee', header: 'Employee', width: '200px', render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.employeeName} size="sm" />
        <span className="font-semibold text-gray-900">{row.employeeName}</span>
      </div>
    )},
    { key: 'type', header: 'Leave Type', width: '160px', render: (row) => (
      <span className="text-sm font-medium text-gray-800">{row.leaveTypeName}</span>
    )},
    { key: 'allocated', header: 'Allocated', width: '100px', render: (row) => (
      <span className="font-semibold text-gray-900">{row.allocated} days</span>
    )},
    { key: 'taken', header: 'Taken', width: '100px', render: (row) => (
      <span className="text-gray-600">{row.taken} days</span>
    )},
    { key: 'remaining', header: 'Remaining', width: '110px', render: (row) => (
      <Badge variant={row.remaining > 5 ? 'success' : 'warning'}>{row.remaining} days</Badge>
    )},
    { key: 'status', header: 'Status', width: '110px', render: (row) => (
      <Badge variant={row.approved ? 'success' : 'warning'}>{row.status}</Badge>
    )},
  ];

  return (
    <div className="space-y-6" data-testid="timeoff-list-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: isEmployee ? 'My Time Off' : 'Time Off' },
      ]} />

      <PageHeader
        title={isEmployee ? "My Time Off & Leaves" : "Time Off & Leaves"}
        subtitle={isEmployee ? "Your leave requests, balances, and allocations" : "Manage employee leave requests, balances, and yearly leave allocations"}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => setNewRequestModal(true)}>
              + Request Time Off
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setCurrentTab('requests')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            currentTab === 'requests'
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Leave Requests ({requestsList.length})
        </button>
        <button
          onClick={() => setCurrentTab('allocations')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            currentTab === 'allocations'
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Leave Allocations ({allocationsList.length})
        </button>
      </div>

      <div className="filter-bar">
        <Input
          placeholder="Search time off records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select
          label="Employee"
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          options={[{ value: 'all', label: 'All Employees' }, ...employeesList.map(e => ({ value: e.id, label: e.name }))]}
          className="w-52"
        />
        {currentTab === 'requests' && (
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Refused', label: 'Refused' },
            ]}
            className="w-40"
          />
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          <Table
            columns={currentTab === 'requests' ? requestColumns : allocationColumns}
            data={currentTab === 'requests' ? filteredRequests : filteredAllocations}
            keyField="id"
            emptyMessage={loading ? "Loading time off records..." : "No time off records found"}
          />
        </CardBody>
      </Card>

      {newRequestModal && (
        <Modal
          isOpen={newRequestModal}
          onClose={() => setNewRequestModal(false)}
          title="New Time Off Request"
        >
          <form onSubmit={handleCreateRequest} className="space-y-4">
            {modalError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {modalError}
              </div>
            )}
            <Select
              label="Employee *"
              value={newReqEmployee}
              onChange={(e) => setNewReqEmployee(e.target.value)}
              options={employeesList.map(e => ({ value: e.id, label: e.name }))}
              required
            />
            <Select
              label="Time Off Type *"
              value={newReqType}
              onChange={(e) => setNewReqType(e.target.value)}
              options={typesList.map(t => ({ value: t.id, label: t.name }))}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date *"
                type="date"
                value={newReqStart}
                onChange={(e) => setNewReqStart(e.target.value)}
                required
              />
              <Input
                label="End Date *"
                type="date"
                value={newReqEnd}
                onChange={(e) => setNewReqEnd(e.target.value)}
                required
              />
            </div>
            <div className="p-3 bg-cream rounded-xl text-xs flex justify-between">
              <span className="text-gray-600">Calculated Duration:</span>
              <span className="font-semibold text-gray-900">{calculatedDuration} days</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setNewRequestModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={submittingReq}>Submit Request</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}