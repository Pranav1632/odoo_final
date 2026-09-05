// src/pages/AttendanceList.jsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, CardBody, PageHeader, Button, Badge, Select, Input, 
  Table, Avatar, Pagination, Breadcrumb, Modal 
} from '../components/UI';
import { formatDate, getStatusColor } from '../lib/formatters';
import { attendanceApi, employeesApi } from '../lib/api';
import { getSession } from '../lib/user';

const statusOptions = [
  { value: 'all', label: 'All Statuses ▾' },
  { value: 'Present', label: 'Present' },
  { value: 'Late', label: 'Late' },
  { value: 'Absent', label: 'Absent' },
  { value: 'Overtime', label: 'Overtime' },
  { value: 'Exception', label: 'Exception' },
];

export function AttendanceList() {
  const navigate = useNavigate();
  const session = getSession();
  const isEmployee = session?.role === 'EMPLOYEE';
  const canManageAttendance = session?.role === 'HR_MANAGER' || session?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const employeeParam = searchParams.get('employeeId') || searchParams.get('employee') || 'all';
  const [employeeFilter, setEmployeeFilter] = useState(employeeParam);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [records, setRecords] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      attendanceApi.getAll().catch(() => []),
      employeesApi.getAll().catch(() => []),
    ]).then(([attData, empData]) => {
      if (Array.isArray(attData)) {
        let list = attData;
        if (isEmployee && session?.employeeId) {
          list = list.filter(a => a.employeeId === session.employeeId);
        }
        setRecords(list.map(a => ({
          id: a.id,
          employeeId: a.employeeId,
          employeeName: a.employee?.name || 'Employee',
          date: a.checkIn?.split('T')[0] || 'Recent',
          checkIn: a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          checkOut: a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          workedHours: a.workedHours ?? (a.checkOut ? 8 : null),
          status: a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1).toLowerCase() : 'Present',
        })));
      }
      if (Array.isArray(empData)) {
        setEmployeesList(empData);
      }
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAttendance = useMemo(() => {
    return records.filter(att => {
      const empName = att.employeeName || '';
      const matchesSearch = !search || 
        empName.toLowerCase().includes(search.toLowerCase());
      const matchesEmp = employeeFilter === 'all' || att.employeeId === employeeFilter;
      const matchesStatus = statusFilter === 'all' || att.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesEmp && matchesStatus;
    });
  }, [records, search, employeeFilter, statusFilter]);

  const totalPages = Math.ceil(filteredAttendance.length / pageSize);
  const paginatedAttendance = filteredAttendance.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleEditClick = (record) => {
    setEditingRecord({ ...record });
    setEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (editingRecord) {
      try {
        await attendanceApi.update(editingRecord.id, {
          status: editingRecord.status.toLowerCase(),
        });
        loadData();
      } catch (err) {
        console.error('Failed to update attendance:', err);
      }
    }
    setEditModal(false);
  };

  const columns = [
    { key: 'employee', header: 'Employee', width: '200px', render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.employeeName} size="sm" />
        <span className="font-semibold text-gray-900">{row.employeeName}</span>
      </div>
    )},
    { key: 'date', header: 'Date', width: '110px', render: (row) => formatDate(row.date) },
    { key: 'checkIn', header: 'Check In', width: '100px', render: (row) => (
      row.checkIn ? <span className="font-mono text-sm">{row.checkIn}</span> : <span className="text-red-500 font-semibold">— Missing —</span>
    )},
    { key: 'checkOut', header: 'Check Out', width: '100px', render: (row) => (
      row.checkOut ? <span className="font-mono text-sm">{row.checkOut}</span> : <span className="text-red-500 font-semibold">— Missing —</span>
    )},
    { key: 'workedHours', header: 'Worked Hours', width: '110px', render: (row) => (
      <span className="font-mono text-sm font-medium">{row.workedHours !== null ? `${row.workedHours} hrs` : '—'}</span>
    )},
    { key: 'status', header: 'Status', width: '120px', render: (row) => {
      const isException = row.status?.toLowerCase() === 'exception';
      return (
        <div className="flex items-center gap-1.5">
          {isException && (
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
          )}
          <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
        </div>
      );
    }},
    ...(canManageAttendance ? [{
      key: 'actions', 
      header: 'Actions', 
      width: '100px', 
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => handleEditClick(row)}>
          Edit
        </Button>
      )
    }] : []),
  ];

  return (
    <div className="space-y-6" data-testid="attendance-list-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: isEmployee ? 'My Attendance' : 'Attendance' },
      ]} />

      <PageHeader
        title={isEmployee ? "My Attendance Records" : "Attendance Records"}
        subtitle={isEmployee ? "Your daily check-in, check-out, and tracked hours" : `Tracking ${records.length} real-time attendance logs and check-in variances`}
      />

      <div className="filter-bar">
        <Input 
          placeholder="Search by date or status..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="w-64" 
        />
        {!isEmployee && (
          <Select 
            value={employeeFilter} 
            onChange={(e) => { setEmployeeFilter(e.target.value); setSearchParams(prev => { prev.set('employeeId', e.target.value); return prev; }); }} 
            options={[{ value: 'all', label: 'All Employees ▾' }, ...employeesList.map(e => ({ value: e.id, label: e.name }))]} 
            className="w-48" 
          />
        )}
        <Select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          options={statusOptions} 
          className="w-40" 
        />
        {(employeeFilter !== 'all' || statusFilter !== 'all' || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setEmployeeFilter('all'); setStatusFilter('all'); setSearchParams({}); }}>
            Clear Filters
          </Button>
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          <Table
            columns={columns}
            data={paginatedAttendance}
            keyField="id"
            emptyMessage={loading ? "Loading attendance records..." : "No attendance records found matching criteria"}
          />
        </CardBody>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showPageSize
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>

      {editModal && editingRecord && (
        <Modal
          isOpen={editModal}
          onClose={() => setEditModal(false)}
          title={`Edit Attendance: ${editingRecord.employeeName}`}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Select
              label="Attendance Status *"
              value={editingRecord.status}
              onChange={(e) => setEditingRecord(prev => ({ ...prev, status: e.target.value }))}
              options={[
                { value: 'Present', label: 'Present' },
                { value: 'Late', label: 'Late' },
                { value: 'Absent', label: 'Absent' },
                { value: 'Overtime', label: 'Overtime' },
                { value: 'Exception', label: 'Exception' },
              ]}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Save Status</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}