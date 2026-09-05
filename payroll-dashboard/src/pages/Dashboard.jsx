import { useState, useMemo } from 'react';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Select, 
  KPICard, AlertItem, Table, Avatar, Pagination, Breadcrumb 
} from '../components/UI';
import { 
  kpiData, chartData, alerts, 
  formatCurrency, getInitials 
} from '../data/mockData';

const departmentOptions = [
  { value: 'all', label: 'All Departments' },
  { value: 'eng', label: 'Engineering' },
  { value: 'mkt', label: 'Marketing' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'ops', label: 'Operations' },
  { value: 'fin', label: 'Finance' },
  { value: 'sal', label: 'Sales' },
];

const employeeTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
];

const periodOptions = [
  { value: '2025-08', label: 'August 2025' },
  { value: '2025-07', label: 'July 2025' },
  { value: '2025-06', label: 'June 2025' },
  { value: '2025-05', label: 'May 2025' },
  { value: '2025-04', label: 'April 2025' },
  { value: '2025-03', label: 'March 2025' },
];

function BarChart({ data, maxValue, height = 200 }) {
  return (
    <div className="h-full flex items-end gap-3 px-2 pb-2" role="img" aria-label="Salary cost by department bar chart">
      {data.map((item, index) => (
        <div key={item.department} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div 
            className="w-full relative rounded-full transition-all duration-500 cursor-pointer group"
            style={{ height: `${Math.max((item.amount / maxValue) * height, 10)}px`, background: 'var(--color-cream)' }}
            title={`${item.department}: ${formatCurrency(item.amount)} (${item.count} employees, ${item.percentage}%)`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && console.log('Navigate to dept', item.department)}
          >
            <div className="absolute inset-0 rounded-full transition-opacity"
              style={{ background: index === 0 ? 'var(--color-ink-900)' : 'var(--color-accent-500)' }} />
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center truncate w-full">{item.department}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(item.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, height = 200, color = 'accent-500' }) {
  const maxValue = Math.max(...data.map(d => d.totalNet));
  const minValue = Math.min(...data.map(d => d.totalNet));
  const range = maxValue - minValue || 1;
  
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item.totalNet - minValue) / range) * 100;
    return `${x},${y.toFixed(1)}`;
  }).join(' ');
  
  return (
    <div className="relative h-full" role="img" aria-label="Monthly net salary trend line chart">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline 
          fill="none" 
          stroke="var(--color-accent-500)" 
          strokeWidth="2" 
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points} 
          vectorEffect="non-scaling-stroke"
        />
        {data.map((item, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - ((item.totalNet - minValue) / range) * 100;
          return (
            <circle
              key={item.month}
              cx={x}
              cy={y}
              r="2.5"
              fill="var(--color-accent-500)"
              stroke="#fff"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${item.month}: ${formatCurrency(item.totalNet)} (${item.payslipCount} payslips)`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
        {data.map((item, index) => (
          <span key={item.month} style={{ left: `${(index / (data.length - 1)) * 100}%` }}>{item.month}</span>
        ))}
      </div>
    </div>
  );
}

function MiniBarChart({ data, height = 100 }) {
  const maxValue = Math.max(...data.map(d => d.count));
  
  return (
    <div className="h-24 flex items-end gap-2 px-1 pb-1" role="img" aria-label="Attendance overview chart">
      {data.map(item => (
        <div key={item.status} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${item.status}: ${item.count} (${item.percentage}%)`}>
          <div 
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-t transition-all duration-500"
            style={{ height: `${Math.max((item.count / maxValue) * height, 4)}px` }}
          >
            <div className={`h-full rounded-t ${['bg-success', 'bg-warning', 'bg-error', 'bg-info'][data.indexOf(item)] || 'bg-gray-400'}`} />
          </div>
          <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center truncate w-full">{item.status}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

export function Dashboard() {
  const [filters, setFilters] = useState({
    period: '2025-08',
    department: 'all',
    employeeType: 'all',
  });
  const [loading, setLoading] = useState(false);
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleApplyFilters = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };
  
  const handleResetFilters = () => {
    setFilters({ period: '2025-08', department: 'all', employeeType: 'all' });
  };
  
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard' },
  ];
  
  const kpiCards = [
    {
      title: 'Total Net Salary',
      value: formatCurrency(kpiData.totalNetSalary),
      trend: kpiData.trends.totalNetSalary,
      trendLabel: 'vs last month',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
    },
    {
      title: 'Payslips Generated',
      value: kpiData.payslipsGenerated.toLocaleString(),
      trend: kpiData.trends.payslipsGenerated,
      trendLabel: 'this period',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      ),
    },
    {
      title: 'Average Salary',
      value: formatCurrency(kpiData.averageSalary),
      trend: kpiData.trends.averageSalary,
      trendLabel: 'per employee',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      ),
    },
    {
      title: 'Approved Time Off',
      value: `${kpiData.approvedTimeOff} days`,
      trend: kpiData.trends.approvedTimeOff,
      trendLabel: 'this period',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      ),
    },
    {
      title: 'Attendance Health',
      value: `${kpiData.attendanceHealth}%`,
      trend: kpiData.trends.attendanceHealth,
      trendLabel: 'from last month',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
    },
  ];
  
  const maxSalaryDept = Math.max(...chartData.salaryByDept.map(d => d.amount));
  
  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <Breadcrumb items={breadcrumbs} />
      
      <PageHeader
        title="Payroll Dashboard"
        subtitle="Overview of payroll metrics, costs, and operational alerts"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>Reset</Button>
            <Button variant="primary" size="sm" onClick={handleApplyFilters} loading={loading}>Apply Filters</Button>
          </div>
        }
      />
      
      <div className="filter-bar" role="search" aria-label="Dashboard filters">
        <Select
          label="Period"
          value={filters.period}
          onChange={(e) => handleFilterChange('period', e.target.value)}
          options={periodOptions}
          className="w-48"
        />
        <Select
          label="Department"
          value={filters.department}
          onChange={(e) => handleFilterChange('department', e.target.value)}
          options={departmentOptions}
          className="w-52"
        />
        <Select
          label="Employee Type"
          value={filters.employeeType}
          onChange={(e) => handleFilterChange('employeeType', e.target.value)}
          options={employeeTypeOptions}
          className="w-48"
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" role="region" aria-label="Key performance indicators">
        {kpiCards.map((kpi, index) => (
          <KPICard key={index} {...kpi} data-testid={`dashboard-kpi-${index}`} />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Salary Cost by Department</h3>
              <Badge variant="primary" size="sm">Live</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <BarChart data={chartData.salaryByDept} maxValue={maxSalaryDept} height={220} />
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Net Salary Trend</h3>
          </CardHeader>
          <CardBody>
            <LineChart data={chartData.monthlyTrend} height={220} />
          </CardBody>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Operational Alerts</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {alerts.map((alert, index) => (
            <AlertItem key={alert.id} {...alert} data-testid={`dashboard-alert-${index}`} />
          ))}
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Overview — August 2025</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <MiniBarChart data={chartData.attendanceOverview} height={100} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">6</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Missing Check-Outs</p>
                  <Button variant="link" size="sm" className="mt-1">Review →</Button>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Manual Edits</p>
                  <Button variant="link" size="sm" className="mt-1">Audit Log →</Button>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">94.2%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Coverage</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Time Off Overview — August 2025</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">89</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Approved Days Taken</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-3xl font-bold text-warning dark:text-warning">4</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending Requests</p>
                  <Button variant="link" size="sm" className="mt-1">Review →</Button>
                </div>
              </div>
              <div className="space-y-3">
                {chartData.timeOffByType.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.color }}>
                      <span className="text-white text-sm font-medium">{item.type.slice(0, 2)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{item.type}</span>
                        <span className="text-gray-500 dark:text-gray-400">{item.days} days</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(item.days / 52) * 100}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}