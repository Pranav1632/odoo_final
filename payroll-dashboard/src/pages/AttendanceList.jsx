// src/pages/AttendanceList.jsx
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, CardBody, PageHeader, Button, Badge, Select, Input, 
  Table, Avatar, Pagination, Breadcrumb, Modal 
} from '../components/UI';
import { 
  attendance as initialAttendance, employees, formatDate, getStatusColor
} from '../data/mockData';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const employeeParam = searchParams.get('employeeId') || searchParams.get('employee') || 'all';
  const [employeeFilter, setEmployeeFilter] = useState(employeeParam);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [records, setRecords] = useState(initialAttendance);
  const [editModal, setEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const filteredAttendance = useMemo(() => {
    return records.filter(att => {
      const emp = employees.find(e => e.id === att.employeeId);
      const matchesSearch = !search || 
        (emp && emp.fullName.toLowerCase().includes(search.toLowerCase()));
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

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (editingRecord) {
      setRecords(prev => prev.map(r => r.id === editingRecord.id ? editingRecord : r));
    }
    setEditModal(false);
  };

  const columns = [
    { key: 'employee', header: 'Employee', width: '200px', render: (row) => {
      const emp = employees.find(e => e.id === row.employeeId);
      return emp ? (
        <div className="flex items-center gap-3">
          <Avatar name={emp.fullName} size="sm" />
          <span className="font-semibold text-gray-900">{emp.fullName}</span>
        </div>
      ) : '—';
    }},
    { key: 'date', header: 'Date', width: '110px', render: (row) => formatDate(row.date) },
    { key: 'checkIn', header: 'Check In', width: '100px', render: (row) => (
      row.checkIn ? <span className="font-mono text-sm">{row.checkIn}</span> : <span className="text-red-500 font-semibold">— Missing —</span>
    )},
    { key: 'checkOut', header: 'Check Out', width: '100px', render: (row) => (
      row.checkOut ? <span className="font-mono text-sm">{row.checkOut}</span> : <span className="text-red-500 font-semibold">— Missing —</span>
    )},
    { key: 'workedHours', header: 'Worked Hours', width: '110px', render: (row) => (
      // Read-only computed worked hours
      <span className="font-mono text-sm font-medium">{row.workedHours}</span>
    )},
    { key: 'status', header: 'Status', width: '120px', render: (row) => {
      const isException = row.status?.toLowerCase() === 'exception';
      return (
        <div className="flex items-center gap-1.5">
          {isException && (
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          )}
          <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
        </div>
      );
    }},
    { key: 'actions', header: 'Actions', width: '100px', render: (row) => (
      <Button variant="ghost" size="sm" onClick={() => handleEditClick(row)}>
        Edit
      </Button>
    )},
  ];

  return (
    <div className="space-y-6" data-testid="attendance-list-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Attendance' },
      ]} />

      <PageHeader
        title="Attendance Records"
        subtitle={`Tracking ${filteredAttendance.length} attendance logs and check-in variances`}
      />

      <div className="filter-bar">
        <Input 
          placeholder="Search by employee..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="w-64" 
        />
        <Select 
          value={employeeFilter} 
          onChange={(e) => { setEmployeeFilter(e.target.value); setSearchParams(prev => { prev.set('employeeId', e.target.value); return prev; }); }} 
          options={[{ value: 'all', label: 'All Employees ▾' }, ...employees.map(e => ({ value: e.id, label: e.fullName }))]} 
          className="w-48" 
        />
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
            emptyMessage="No attendance records found matching criteria"
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

      {/* Edit Attendance Record Modal with read-only worked hours */}
      {editingRecord && (
        <Modal
          isOpen={editModal}
          onClose={() => setEditModal(false)}
          title="Edit Attendance Entry"
          size="sm"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Check In Time"
                type="time"
                value={editingRecord.checkIn || '09:00'}
                onChange={(e) => setEditingRecord(prev => ({ ...prev, checkIn: e.target.value }))}
              />
              <Input
                label="Check Out Time"
                type="time"
                value={editingRecord.checkOut || '18:00'}
                onChange={(e) => setEditingRecord(prev => ({ ...prev, checkOut: e.target.value }))}
              />
            </div>
            <Select
              label="Status"
              value={editingRecord.status}
              onChange={(e) => setEditingRecord(prev => ({ ...prev, status: e.target.value }))}
              options={[
                { value: 'Present', label: 'Present' },
                { value: 'Late', label: 'Late' },
                { value: 'Absent', label: 'Absent' },
                { value: 'Overtime', label: 'Overtime' },
                { value: 'Exception', label: 'Exception' },
                { value: 'Corrected', label: 'Corrected' },
              ]}
            />
            <div className="p-3 bg-cream rounded-xl text-xs flex justify-between items-center">
              <span className="text-gray-500">Worked Hours (Computed Server-Side):</span>
              <span className="font-mono font-bold text-gray-900">{editingRecord.workedHours}</span>
            </div>
            <div className="modal-footer pt-3">
              <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}