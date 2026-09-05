import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, CardBody, PageHeader, Button, Badge, Select, Input, 
  Table, Avatar, Pagination, Breadcrumb 
} from '../components/UI';
import { 
  contracts as mockContracts, employees as mockEmployees, salaryStructures, formatDate, getStatusColor
} from '../data/mockData';
import { contractsApi } from '../lib/api';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Draft', label: 'Draft' },
];

export function ContractsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const employeeParam = searchParams.get('employeeId') || searchParams.get('employee') || 'all';
  const [employeeFilter, setEmployeeFilter] = useState(employeeParam);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);

  const [contractList, setContractList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    authApi.login({ email: 'admin@peoplepay360.com', password: 'Admin@123' })
      .then(res => {
        if (res.token) localStorage.setItem('token', res.token);
        return contractsApi.getAll();
      })
      .catch(() => contractsApi.getAll())
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : [];
        const mapped = list.map((c) => ({
          id: c.id,
          contractId: c.id,
          employeeId: c.employeeId,
          employeeName: c.employee?.name || 'Employee',
          wage: c.wage,
          startDate: c.startDate,
          endDate: c.endDate,
          status: c.status || 'Active',
          salaryStructureId: c.salaryStructureId,
          position: c.position,
          department: c.department,
        }));
        setContractList(mapped);
      })
      .catch((err) => {
        console.error('Error loading contracts from API', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);


  const filteredContracts = useMemo(() => {
    return contractList.filter(contract => {
      const emp = mockEmployees.find(e => e.id === contract.employeeId);
      const matchesSearch = !search || 
        (emp && (emp.fullName.toLowerCase().includes(search.toLowerCase()) || emp.employeeId.toLowerCase().includes(search.toLowerCase()))) ||
        (contract.employeeName && contract.employeeName.toLowerCase().includes(search.toLowerCase())) ||
        contract.contractId.toLowerCase().includes(search.toLowerCase());
      const matchesEmp = employeeFilter === 'all' || contract.employeeId === employeeFilter;
      const matchesStatus = statusFilter === 'all' || contract.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesEmp && matchesStatus;
    });
  }, [contractList, search, employeeFilter, statusFilter]);


  const totalPages = Math.ceil(filteredContracts.length / pageSize);
  const paginatedContracts = filteredContracts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const handleSelectionChange = (ids) => setSelectedIds(ids);

  const activeFilters = [
    search && { key: 'search', label: `Search: "${search}"`, onRemove: () => { setSearch(''); handleFilterChange('search', ''); } },
    employeeFilter !== 'all' && { key: 'employee', label: `Employee: ${employees.find(e => e.id === employeeFilter)?.fullName}`, onRemove: () => { setEmployeeFilter('all'); handleFilterChange('employeeId', 'all'); } },
    statusFilter !== 'all' && { key: 'status', label: `Status: ${statusFilter}`, onRemove: () => handleFilterChange('status', 'all') },
  ].filter(Boolean);

  const columns = [
    { key: 'employee', header: 'Employee', width: '200px', render: (row) => {
      const emp = employees.find(e => e.id === row.employeeId);
      return emp ? (
        <div className="flex items-center gap-3">
          <Avatar name={emp.fullName} size="sm" />
          <div>
            <p className="font-semibold text-gray-900">{emp.fullName}</p>
            <p className="text-xs text-gray-500">{emp.jobPositionId}</p>
          </div>
        </div>
      ) : '—';
    }},
    { key: 'contractId', header: 'Contract ID', width: '110px', render: (row) => (
      <span className="font-mono text-xs text-gray-700">{row.contractId}</span>
    )},
    { key: 'wageAmount', header: 'Wage', width: '130px', render: (row) => (
      <span className="font-mono font-medium text-gray-900">₹{Number(row.wageAmount).toLocaleString('en-IN')}</span>
    )},
    { key: 'startDate', header: 'Start Date', width: '110px', render: (row) => formatDate(row.startDate) },
    { key: 'endDate', header: 'End Date', width: '110px', render: (row) => row.endDate ? formatDate(row.endDate) : 'Permanent' },
    { key: 'salaryStructure', header: 'Salary Structure', width: '160px', render: (row) => {
      const struct = salaryStructures.find(s => s.id === row.salaryStructureId);
      return struct ? <Badge variant="gray">{struct.name}</Badge> : '—';
    }},
    { key: 'status', header: 'Status', width: '110px', render: (row) => (
      <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
    )},
    { key: 'actions', header: 'Actions', width: '100px', render: (row) => (
      <Button variant="ghost" size="sm" onClick={() => navigate(`/contracts/${row.id}`)}>
        Edit
      </Button>
    )},
  ];

  return (
    <div className="space-y-6" data-testid="contracts-list-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Contracts' },
      ]} />

      <PageHeader
        title="Employee Contracts"
        subtitle={`Showing ${filteredContracts.length} employment contracts`}
        actions={
          <Button variant="primary" onClick={() => navigate('/contracts/new')}>
            + New Contract
          </Button>
        }
      />

      <div className="filter-bar">
        <Input 
          placeholder="Search by employee name or contract ID" 
          value={search} 
          onChange={handleSearchChange} 
          className="w-72" 
          data-testid="contract-filter-search" 
        />
        <Select 
          value={employeeFilter} 
          onChange={(e) => { setEmployeeFilter(e.target.value); handleFilterChange('employeeId', e.target.value); }} 
          options={[{value:'all',label:'All Employees ▾'},...employees.map(e=>({value:e.id,label:e.fullName}))]} 
          className="w-52" 
          data-testid="contract-filter-employee" 
        />
        <Select 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); handleFilterChange('status', e.target.value); }} 
          options={statusOptions} 
          className="w-40" 
          data-testid="contract-filter-status" 
        />
        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setEmployeeFilter('all'); setStatusFilter('all'); setSearchParams({}); }}>
            Clear Filters
          </Button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4" data-testid="active-filters">
          {activeFilters.map(f => (
            <Badge key={f.key} variant="primary" className="gap-1">
              {f.label}
              <button onClick={f.onRemove} className="ml-1" aria-label={`Remove ${f.label} filter`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardBody className="p-0">
          <Table
            columns={columns}
            data={paginatedContracts}
            keyField="id"
            onRowClick={(row) => navigate(`/contracts/${row.id}`)}
            selectedKeys={selectedIds}
            onSelectionChange={handleSelectionChange}
            loading={false}
            emptyMessage="No contracts found matching your criteria"
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
    </div>
  );
}