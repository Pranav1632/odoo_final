import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Select, Input, 
  Table, Avatar, Pagination, Breadcrumb 
} from '../components/UI';
import { 
  formatDate, formatCurrency, getStatusColor
} from '../lib/formatters';
import { payrunsApi, salaryStructuresApi } from '../lib/api';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Computed', label: 'Computed' },
  { value: 'Validated', label: 'Validated' },
  { value: 'Paid', label: 'Paid' },
];

export function PayrunsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [periodFilter, setPeriodFilter] = useState(searchParams.get('period') || 'all');
  const [structureFilter, setStructureFilter] = useState(searchParams.get('structure') || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [payrunList, setPayrunList] = useState([]);
  const [structureList, setStructureList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      payrunsApi.getAll().catch(() => []),
      salaryStructuresApi.getAll().catch(() => []),
    ]).then(([prData, structData]) => {
      if (!isMounted) return;
      if (Array.isArray(prData)) {
        setPayrunList(prData.map(p => ({
          id: p.id,
          name: p.name,
          periodStart: p.periodStart?.split('T')[0] || p.periodStart,
          periodEnd: p.periodEnd?.split('T')[0] || p.periodEnd,
          status: p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1).toLowerCase() : 'Draft',
          salaryStructureId: p.salaryStructureId,
          payslipsCount: p._count?.payslips ?? p.payslips?.length ?? 0,
          totalNet: p.totalNet || 0,
        })));
      } else {
        setPayrunList([]);
      }
      if (Array.isArray(structData)) {
        setStructureList(structData);
      } else {
        setStructureList([]);
      }
    }).finally(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const structureOptions = [
    { value: 'all', label: 'All Structures' },
    ...structureList.map(s => ({ value: s.id, label: s.name })),
  ];

  const periodOptions = useMemo(() => {
    const periods = Array.from(new Set(payrunList.map(p => p.periodStart ? p.periodStart.slice(0, 7) : null).filter(Boolean)));
    return [
      { value: 'all', label: 'All Periods' },
      ...periods.map(period => ({
        value: period,
        label: period,
      })),
    ];
  }, [payrunList]);

  const filteredPayruns = useMemo(() => {
    return payrunList.filter(pr => {
      const matchesSearch = !search || 
        pr.name.toLowerCase().includes(search.toLowerCase()) ||
        (pr.periodStart && pr.periodStart.includes(search)) ||
        (pr.periodEnd && pr.periodEnd.includes(search));
      const matchesStatus = statusFilter === 'all' || pr.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesPeriod = periodFilter === 'all' || 
        (pr.periodStart && pr.periodStart.startsWith(periodFilter)) || 
        (pr.periodEnd && pr.periodEnd.startsWith(periodFilter));
      const matchesStruct = structureFilter === 'all' || pr.salaryStructureId === structureFilter;
      return matchesSearch && matchesStatus && matchesPeriod && matchesStruct;
    });
  }, [payrunList, search, statusFilter, periodFilter, structureFilter]);
  
  const totalPages = Math.ceil(filteredPayruns.length / pageSize);
  const paginatedPayruns = filteredPayruns.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
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
    statusFilter !== 'all' && { key: 'status', label: `Status: ${statusFilter}`, onRemove: () => handleFilterChange('status', 'all') },
    periodFilter !== 'all' && { key: 'period', label: `Period: ${periodFilter}`, onRemove: () => handleFilterChange('period', 'all') },
    structureFilter !== 'all' && { key: 'structure', label: `Structure: ${structureList.find(s => s.id === structureFilter)?.name || structureFilter}`, onRemove: () => handleFilterChange('structure', 'all') },
  ].filter(Boolean);
  
  const columns = [
    { key: 'name', header: 'Payrun Name', width: '200px', render: (row) => (
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{row.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{row.periodStart} – {row.periodEnd}</p>
      </div>
    )},
    { key: 'period', header: 'Period', width: '160px', render: (row) => `${formatDate(row.periodStart)} – ${formatDate(row.periodEnd)}` },
    { key: 'salaryStructure', header: 'Salary Structure', width: '160px', render: (row) => {
      const struct = structureList.find(s => s.id === row.salaryStructureId);
      return struct ? struct.name : '—';
    }},
    { key: 'employees', header: 'Employees', width: '100px', render: (row) => `${row.payslipsCount ?? row.employees?.length ?? 0}` },
    { key: 'totalNet', header: 'Total Net', width: '120px', render: (row) => formatCurrency(row.totalNet) },
    { key: 'status', header: 'Status', width: '110px', render: (row) => {
      const isPaid = row.status === 'Paid';
      return (
        <Badge variant={getStatusColor(row.status)} className={isPaid ? 'opacity-70' : ''}>
          <span className="flex items-center gap-1.5">
            {isPaid && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3 3a.75.75 0 001.06 1.061l2.293-2.293 2.293 2.293a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd"/></svg>}
            {row.status}
          </span>
        </Badge>
      );
    }},
    { key: 'createdBy', header: 'Created By', width: '140px' },
    { key: 'actions', header: 'Actions', width: '120px', render: (row) => (
      <Button variant="ghost" size="sm" onClick={() => navigate(`/payroll/payruns/${row.id}`)}>View</Button>
    )},
  ];
  
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Payroll', href: '/payroll/payruns' },
    { label: 'Payruns' },
  ];
  
  return (
    <div className="space-y-6" data-testid="payruns-list-page">
      <Breadcrumb items={breadcrumbs} />
      
      <PageHeader
        title="Payruns"
        subtitle={`Showing ${filteredPayruns.length} payruns`}
        actions={
          <Button variant="primary" onClick={() => navigate('/payroll/payruns/new')} data-testid="payrun-list-create-btn">+ New Payrun</Button>
        }
      />
      
      <div className="filter-bar">
        <Input placeholder="Search by name or period" value={search} onChange={handleSearchChange} className="w-72" data-testid="payrun-filter-search" />
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); handleFilterChange('status', e.target.value); }} options={statusOptions} className="w-40" data-testid="payrun-filter-status" />
        <Select value={periodFilter} onChange={(e) => { setPeriodFilter(e.target.value); handleFilterChange('period', e.target.value); }} options={periodOptions} className="w-40" data-testid="payrun-filter-period" />
        <Select value={structureFilter} onChange={(e) => { setStructureFilter(e.target.value); handleFilterChange('structure', e.target.value); }} options={structureOptions} className="w-48" data-testid="payrun-filter-structure" />
        <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setPeriodFilter('all'); setStructureFilter('all'); setSearchParams({}); }}>Clear Filters</Button>
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
            data={paginatedPayruns}
            keyField="id"
            onRowClick={(row) => navigate(`/payroll/payruns/${row.id}`)}
            selectedKeys={selectedIds}
            onSelectionChange={handleSelectionChange}
            loading={loading}
            emptyMessage="No payruns found matching your criteria"
          />
        </CardBody>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-primary-700">
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