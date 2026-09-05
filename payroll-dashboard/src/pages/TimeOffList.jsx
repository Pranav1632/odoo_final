// src/pages/TimeOffList.jsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Select, Input, 
  Table, Avatar, Pagination, Breadcrumb, Modal 
} from '../components/UI';
import { 
  timeOffRequests as initialRequests, 
  timeOffTypes as initialTypes, 
  employees, 
  allocations as initialAllocations,
  formatDate, getStatusColor
} from '../data/mockData';
import { getSession } from '../lib/user';

export function TimeOffList() {
  const navigate = useNavigate();
  const session = getSession();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialTab = searchParams.get('tab') || 'requests';
  const [currentTab, setCurrentTab] = useState(initialTab);

  // Sync tab with URL searchParams
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== currentTab) {
      setCurrentTab(tab);
    }
  }, [searchParams]);

  const [requestsList, setRequestsList] = useState(initialRequests);
  const [allocationsList, setAllocationsList] = useState(
    initialAllocations.map(a => ({ ...a, approved: a.status === 'Approved' }))
  );
  const [typesList, setTypesList] = useState(initialTypes);

  // Filters
  const employeeParam = searchParams.get('employeeId') || searchParams.get('employee') || 'all';
  const [employeeFilter, setEmployeeFilter] = useState(employeeParam);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Request Modal State
  const [newRequestModal, setNewRequestModal] = useState(false);
  const [newReqEmployee, setNewReqEmployee] = useState(employees[0]?.id || '');
  const [newReqType, setNewReqType] = useState(initialTypes[0]?.id || '');
  const [newReqStart, setNewReqStart] = useState('');
  const [newReqEnd, setNewReqEnd] = useState('');
  const [newReqReason, setNewReqReason] = useState('');

  // Auto-calculated duration in days
  const calculatedDuration = useMemo(() => {
    if (!newReqStart || !newReqEnd) return '0 days';
    const start = new Date(newReqStart);
    const end = new Date(newReqEnd);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays > 0 ? diffDays : 1} days`;
  }, [newReqStart, newReqEnd]);

  // Handle Approve Request without page reload (Task 8 requirement)
  const handleApproveRequest = (reqId) => {
    setRequestsList(prev => prev.map(r => r.id === reqId ? { ...r, status: 'Approved' } : r));
  };

  const handleRefuseRequest = (reqId) => {
    setRequestsList(prev => prev.map(r => r.id === reqId ? { ...r, status: 'Refused' } : r));
  };

  // Handle Approve Allocation
  const handleApproveAllocation = (allocId) => {
    setAllocationsList(prev => prev.map(a => a.id === allocId ? { ...a, approved: true, status: 'Approved' } : a));
  };

  const handleCreateRequest = (e) => {
    e.preventDefault();
    const newReq = {
      id: `tor-new-${Date.now()}`,
      employeeId: newReqEmployee,
      leaveTypeId: newReqType,
      fromDate: newReqStart,
      toDate: newReqEnd,
      duration: calculatedDuration,
      reason: newReqReason,
      status: 'Pending',
      requestedOn: new Date().toISOString().split('T')[0],
    };
    setRequestsList(prev => [newReq, ...prev]);
    setNewRequestModal(false);
  };

  const filteredRequests = useMemo(() => {
    return requestsList.filter(req => {
      const emp = employees.find(e => e.id === req.employeeId);
      const matchesSearch = !search || 
        (emp && emp.fullName.toLowerCase().includes(search.toLowerCase())) ||
        req.reason?.toLowerCase().includes(search.toLowerCase());
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
    { key: 'employee', header: 'Employee', width: '200px', render: (row) => {
      const emp = employees.find(e => e.id === row.employeeId);
      return emp ? (
        <div className="flex items-center gap-3">
          <Avatar name={emp.fullName} size="sm" />
          <span className="font-semibold text-gray-900">{emp.fullName}</span>
        </div>
      ) : '—';
    }},
    { key: 'type', header: 'Type', width: '150px', render: (row) => {
      const type = typesList.find(t => t.id === row.leaveTypeId);
      return type ? (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color || '#16a34a' }}></span>
          <span className="text-sm font-medium text-gray-800">{type.name}</span>
        </span>
      ) : row.leaveTypeId;
    }},
    { key: 'from', header: 'From', width: '110px', render: (row) => formatDate(row.fromDate) },
    { key: 'to', header: 'To', width: '110px', render: (row) => formatDate(row.toDate) },
    { key: 'duration', header: 'Duration', width: '100px', render: (row) => <span className="font-medium text-gray-900">{row.duration}</span> },
    { key: 'status', header: 'Status', width: '110px', render: (row) => (
      <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
    )},
    { key: 'actions', header: 'Actions', width: '160px', render: (row) => (
      <div className="flex items-center gap-1">
        {row.status === 'Pending' ? (
          <>
            <Button variant="success" size="sm" onClick={() => handleApproveRequest(row.id)}>Approve</Button>
            <Button variant="danger" size="sm" onClick={() => handleRefuseRequest(row.id)}>Refuse</Button>
          </>
        ) : (
          <span className="text-xs text-gray-400">Completed</span>
        )}
      </div>
    )},
  ];

  const allocationColumns = [
    { key: 'employee', header: 'Employee', width: '200px', render: (row) => {
      const emp = employees.find(e => e.id === row.employeeId);
      return emp ? (
        <div className="flex items-center gap-3">
          <Avatar name={emp.fullName} size="sm" />
          <span className="font-semibold text-gray-900">{emp.fullName}</span>
        </div>
      ) : '—';
    }},
    { key: 'type', header: 'Type', width: '150px', render: (row) => {
      const type = typesList.find(t => t.id === row.leaveTypeId);
      return type ? (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color || '#16a34a' }}></span>
          <span className="text-sm font-medium text-gray-800">{type.name}</span>
        </span>
      ) : row.leaveTypeId;
    }},
    { key: 'allocated', header: 'Allocated', width: '100px', render: (row) => `${row.allocated} days` },
    { key: 'taken', header: 'Taken', width: '90px', render: (row) => `${row.taken} days` },
    { key: 'remaining', header: 'Remaining', width: '110px', render: (row) => (
      // ponytail: read directly from response field as specified in contract, do not compute client side
      <Badge variant={row.remaining > 5 ? 'success' : row.remaining > 0 ? 'warning' : 'gray'}>
        {row.remaining} days left
      </Badge>
    )},
    { key: 'validFrom', header: 'Valid From', width: '110px', render: (row) => formatDate(row.validFrom) },
    { key: 'validUntil', header: 'Valid To', width: '110px', render: (row) => formatDate(row.validUntil) },
    { key: 'approved', header: 'Approved', width: '110px', render: (row) => (
      <Badge variant={row.approved ? 'success' : 'warning'}>{row.approved ? 'Approved' : 'Pending'}</Badge>
    )},
    { key: 'actions', header: 'Actions', width: '140px', render: (row) => (
      <div>
        {!row.approved && (
          <Button variant="success" size="sm" onClick={() => handleApproveAllocation(row.id)}>
            Approve Allocation
          </Button>
        )}
      </div>
    )},
  ];

  const typeColumns = [
    { key: 'name', header: 'Name', width: '220px', render: (row) => (
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }}></span>
        <span className="font-semibold text-gray-900">{row.name} ({row.code})</span>
      </div>
    )},
    { key: 'unit', header: 'Unit', width: '120px', render: (row) => <Badge variant="gray">{row.unit}</Badge> },
    { key: 'requiresAllocation', header: 'Requires Allocation', width: '160px', render: (row) => (
      <Badge variant={row.requiresAllocation ? 'primary' : 'gray'}>{row.requiresAllocation ? 'Yes' : 'No'}</Badge>
    )},
    { key: 'payrollImpact', header: 'Payroll Integrated', width: '160px', render: (row) => (
      <Badge variant={row.payrollImpact === 'Paid' ? 'success' : 'warning'}>{row.payrollImpact === 'Paid' ? 'Yes (Paid)' : 'Unpaid'}</Badge>
    )},
    { key: 'maxPerYear', header: 'Max / Year', width: '120px', render: (row) => `${row.maxPerYear} ${row.unit}` },
  ];

  return (
    <div className="space-y-6" data-testid="timeoff-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Time Off' },
      ]} />

      <PageHeader
        title="Time Off & Leaves"
        subtitle="Manage leave requests, department allocations, and leave policy types"
        actions={
          <Button variant="primary" onClick={() => setNewRequestModal(true)}>
            + New Request
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'requests', label: 'Time Off Requests', count: filteredRequests.length },
          { id: 'allocations', label: 'Allocations & Balances', count: filteredAllocations.length },
          { id: 'types', label: 'Time Off Types', count: typesList.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setCurrentTab(tab.id);
              setSearchParams(prev => { prev.set('tab', tab.id); return prev; });
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              currentTab === tab.id
                ? 'bg-ink-900 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-cream'
            }`}
          >
            {tab.label} <span className="ml-1 text-xs opacity-75">({tab.count})</span>
          </button>
        ))}
      </div>

      {currentTab === 'requests' && (
        <div className="space-y-4">
          <div className="filter-bar">
            <Input 
              placeholder="Search employee or reason..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-64" 
            />
            <Select 
              value={employeeFilter} 
              onChange={(e) => setEmployeeFilter(e.target.value)} 
              options={[{ value: 'all', label: 'All Employees ▾' }, ...employees.map(e => ({ value: e.id, label: e.fullName }))]} 
              className="w-48" 
            />
            <Select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              options={[
                { value: 'all', label: 'All Statuses ▾' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'refused', label: 'Refused' },
              ]} 
              className="w-40" 
            />
          </div>

          <Card>
            <CardBody className="p-0">
              <Table
                columns={requestColumns}
                data={filteredRequests}
                keyField="id"
                emptyMessage="No time off requests found"
              />
            </CardBody>
          </Card>
        </div>
      )}

      {currentTab === 'allocations' && (
        <Card>
          <CardBody className="p-0">
            <Table
              columns={allocationColumns}
              data={filteredAllocations}
              keyField="id"
              emptyMessage="No allocations found"
            />
          </CardBody>
        </Card>
      )}

      {currentTab === 'types' && (
        <Card>
          <CardBody className="p-0">
            <Table
              columns={typeColumns}
              data={typesList}
              keyField="id"
              emptyMessage="No leave types found"
            />
          </CardBody>
        </Card>
      )}

      {/* New Request Modal with duration auto-calc */}
      <Modal
        isOpen={newRequestModal}
        onClose={() => setNewRequestModal(false)}
        title="Submit Time Off Request"
        size="md"
      >
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <Select
            label="Employee *"
            value={newReqEmployee}
            onChange={(e) => setNewReqEmployee(e.target.value)}
            options={employees.map(e => ({ value: e.id, label: `${e.fullName} (${e.employeeId})` }))}
            required
          />
          <Select
            label="Time Off Type *"
            value={newReqType}
            onChange={(e) => setNewReqType(e.target.value)}
            options={typesList.map(t => ({ value: t.id, label: `${t.name} (${t.unit})` }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
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
          <div className="p-3 bg-cream rounded-xl flex items-center justify-between text-sm">
            <span className="text-gray-600">Calculated Duration:</span>
            <span className="font-bold text-gray-900">{calculatedDuration}</span>
          </div>
          <Input
            label="Reason"
            value={newReqReason}
            onChange={(e) => setNewReqReason(e.target.value)}
            placeholder="Brief reason for time off"
          />
          <div className="modal-footer pt-4">
            <Button variant="secondary" onClick={() => setNewRequestModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}