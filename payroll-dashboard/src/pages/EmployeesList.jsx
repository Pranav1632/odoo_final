import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, CardBody, PageHeader, Button, Badge, Select, Input, 
  Table, Avatar, Pagination, Breadcrumb, Dropdown, Modal 
} from '../components/UI';
import { getStatusColor, DEPARTMENTS as departments, JOB_POSITIONS as jobPositions } from '../lib/formatters';
import { getSession } from '../lib/user';
import { employeesApi, authApi } from '../lib/api';







const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'On Leave', label: 'On Leave' },
];

export function EmployeesList() {
  const navigate = useNavigate();
  const session = getSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [departmentFilter, setDepartmentFilter] = useState(searchParams.get('department') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [employeeList, setEmployeeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    employeesApi.getAll()
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : [];
        const mapped = list.map((emp) => ({
          id: emp.id,
          fullName: emp.name,
          employeeId: emp.id,
          workEmail: `${emp.name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
          departmentId: emp.department || 'Engineering',
          jobPositionId: emp.jobPosition || 'Developer',
          scheduleName: emp.schedule?.name || emp.scheduleId || 'Standard',
          employmentStatus: emp.status === 'active' ? 'Active' : 'Inactive',
          contractsCount: emp._count?.contracts ?? emp.contracts?.length ?? 0,
          attendanceCount: emp._count?.attendances ?? 0,
        }));
        setEmployeeList(mapped);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);


  // Role check per Task 4 and security test:
  const canCreateEmployee = 
    !session || 
    session.role === 'HR_MANAGER' || 
    session.role === 'HR_PAYROLL_MANAGER' || 
    session.role === 'ADMIN';

  const filteredEmployees = useMemo(() => {
    return employeeList.filter(emp => {
      const matchesSearch = !search || 
        emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        (emp.workEmail && emp.workEmail.toLowerCase().includes(search.toLowerCase()));
      const matchesDept = departmentFilter === 'all' || emp.departmentId === departmentFilter;
      const matchesStatus = statusFilter === 'all' || emp.employmentStatus === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employeeList, search, departmentFilter, statusFilter]);


  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    setSearchParams(prev => { prev.set('search', value); return prev; });
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setSearchParams(prev => { 
      if (value === 'all') prev.delete(key);
      else prev.set(key, value);
      return prev; 
    });
    setCurrentPage(1);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSearchParams(prev => { prev.set('view', mode); return prev; });
  };

  const columns = [
    { key: 'avatar', header: '', width: '56px', render: (row) => (
      <Avatar name={row.fullName} size="sm" data-testid={`employee-avatar-${row.id}`} />
    )},
    { key: 'fullName', header: 'Name', width: '200px', render: (row) => (
      <div>
        <p className="font-semibold text-gray-900">{row.fullName}</p>
        <p className="text-xs text-gray-500 font-mono">{row.employeeId}</p>
      </div>
    )},
    { key: 'department', header: 'Department', width: '140px', render: (row) => (
      row.departmentId || 'General'
    )},
    { key: 'jobPosition', header: 'Job Position', width: '160px', render: (row) => (
      row.jobPositionId || 'Staff'
    )},
    { key: 'schedule', header: 'Schedule', width: '140px', render: (row) => (
      <Badge variant="gray">{row.scheduleName || 'Standard'}</Badge>
    )},
    { key: 'status', header: 'Status', width: '100px', render: (row) => (
      <Badge variant={getStatusColor(row.employmentStatus)}>{row.employmentStatus}</Badge>
    )},
    { key: 'contractsCount', header: 'Contracts', width: '100px', render: (row) => (
      <span className="text-xs font-semibold text-gray-700">{row.contractsCount || 0}</span>
    )},
    { key: 'attendanceCount', header: 'Attendance', width: '110px', render: (row) => (
      <span className="text-xs font-semibold text-gray-700">{row.attendanceCount || 0} logs</span>
    )},
    { key: 'actions', header: 'Actions', width: '120px', render: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/employees/${row.id}`)}>View</Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/employees/${row.id}/edit`)}>Edit</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6" data-testid="employees-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Employees' },
      ]} />

      <PageHeader
        title="Employees Directory"
        subtitle={`Showing ${filteredEmployees.length} employee profiles`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex bg-cream p-1 rounded-full border border-gray-200">
              <button
                onClick={() => handleViewModeChange('list')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  viewMode === 'list' ? 'bg-ink-900 text-white shadow-soft' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => handleViewModeChange('kanban')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  viewMode === 'kanban' ? 'bg-ink-900 text-white shadow-soft' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Kanban View
              </button>
            </div>
            {canCreateEmployee && (
              <Button variant="primary" onClick={() => navigate('/employees/new')}>
                + New Employee
              </Button>
            )}
          </div>
        }
      />

      <div className="filter-bar">
        <Input 
          placeholder="Search by name, ID, email..." 
          value={search} 
          onChange={handleSearchChange} 
          className="w-64" 
          data-testid="employee-filter-search" 
        />
        <Select 
          value={departmentFilter} 
          onChange={(e) => { setDepartmentFilter(e.target.value); handleFilterChange('department', e.target.value); }} 
          options={[{ value: 'all', label: 'All Departments ▾' }, ...departments.map(d => ({ value: d.id, label: d.name }))]} 
          className="w-48" 
          data-testid="employee-filter-department" 
        />
        <Select 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); handleFilterChange('status', e.target.value); }} 
          options={statusOptions} 
          className="w-40" 
          data-testid="employee-filter-status" 
        />
        {(departmentFilter !== 'all' || statusFilter !== 'all' || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDepartmentFilter('all'); setStatusFilter('all'); setSearchParams({}); }}>
            Clear Filters
          </Button>
        )}
      </div>

      {viewMode === 'list' ? (
        <Card>
          <CardBody className="p-0">
            <Table
              columns={columns}
              data={paginatedEmployees}
              keyField="id"
              onRowClick={(row) => navigate(`/employees/${row.id}`)}
              emptyMessage="No employees found matching criteria"
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
      ) : (
        /* Static Read-only Kanban grouped by department */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="employees-kanban-view">
          {departments.map(dept => {
            const deptEmployees = filteredEmployees.filter(e => e.departmentId === dept.id);
            return (
              <div key={dept.id} className="bg-white rounded-2xl p-4 shadow-soft border border-black/[0.04] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm">{dept.name}</h3>
                  <Badge variant="gray" size="sm">{deptEmployees.length}</Badge>
                </div>
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
                  {deptEmployees.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-6">No employees</p>
                  ) : (
                    deptEmployees.map(emp => (
                      <div
                        key={emp.id}
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="p-3 bg-cream/60 hover:bg-cream rounded-xl cursor-pointer transition-all border border-gray-100 space-y-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar name={emp.fullName} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm truncate">{emp.fullName}</p>
                            <p className="text-xs text-gray-500 truncate">{jobPositions.find(p => p.id === emp.jobPositionId)?.name || emp.jobPositionId}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[11px] font-mono text-gray-500">{emp.employeeId}</span>
                          <Badge variant={getStatusColor(emp.employmentStatus)} size="sm">{emp.employmentStatus}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}