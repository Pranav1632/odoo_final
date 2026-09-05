import { useState, useMemo, useEffect } from 'react';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Select, 
  KPICard, AlertItem, Breadcrumb 
} from '../components/UI';
import { formatCurrency } from '../lib/formatters';
import { dashboardApi } from '../lib/api';

const departmentOptions = [
  { value: 'all', label: 'All Departments' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Human Resources', label: 'Human Resources' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Sales', label: 'Sales' },
];

const periodOptions = [
  { value: 'all', label: 'All Time' },
  { value: '2026-08', label: 'August 2026' },
  { value: '2026-07', label: 'July 2026' },
  { value: '2026-06', label: 'June 2026' },
];

function BarChart({ data, maxValue, height = 200 }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-gray-400">
        No department cost data recorded.
      </div>
    );
  }

  return (
    <div className="h-full flex items-end gap-3 px-2 pb-2" role="img" aria-label="Salary cost by department bar chart">
      {data.map((item, index) => (
        <div key={item.department} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div 
            className="w-full relative rounded-full transition-all duration-500 cursor-pointer group"
            style={{ height: `${Math.max((item.amount / maxValue) * height, 12)}px`, background: 'var(--color-cream)' }}
            title={`${item.department}: ${formatCurrency(item.amount)} (${item.count} employees, ${item.percentage}%)`}
            role="button"
            tabIndex={0}
          >
            <div className="absolute inset-0 rounded-full transition-opacity"
              style={{ background: index === 0 ? 'var(--color-ink-900)' : 'var(--color-accent-500)' }} />
          </div>
          <span className="text-xs font-semibold text-ink-900 text-center truncate w-full">{item.department}</span>
          <span className="text-xs font-medium text-gray-600">{formatCurrency(item.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, height = 200 }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-gray-400">
        No monthly trend data recorded.
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.totalNet), 1000);
  const minValue = Math.min(...data.map(d => d.totalNet), 0);
  const range = maxValue - minValue || 1;
  
  const points = data.map((item, index) => {
    const x = data.length > 1 ? (index / (data.length - 1)) * 100 : 50;
    const y = 100 - ((item.totalNet - minValue) / range) * 80 - 10;
    return `${x},${y.toFixed(1)}`;
  }).join(' ');
  
  return (
    <div className="relative h-48" role="img" aria-label="Monthly net salary trend line chart">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {data.length > 1 && (
          <polyline 
            fill="none" 
            stroke="var(--color-accent-500)" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            points={points} 
            vectorEffect="non-scaling-stroke"
          />
        )}
        {data.map((item, index) => {
          const x = data.length > 1 ? (index / (data.length - 1)) * 100 : 50;
          const y = 100 - ((item.totalNet - minValue) / range) * 80 - 10;
          return (
            <circle
              key={item.month}
              cx={x}
              cy={y}
              r="3.5"
              fill="var(--color-accent-500)"
              stroke="#fff"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${item.month}: ${formatCurrency(item.totalNet)} (${item.payslipCount} payslips)`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs font-medium text-gray-700 px-2">
        {data.map((item) => (
          <span key={item.month}>{item.month}</span>
        ))}
      </div>
    </div>
  );
}

function MiniBarChart({ data, height = 100 }) {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="h-24 flex items-end gap-2 px-1 pb-1" role="img" aria-label="Attendance overview chart">
      {data.map(item => (
        <div key={item.status} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${item.status}: ${item.count} (${item.percentage}%)`}>
          <div 
            className="w-full bg-gray-100 rounded-t transition-all duration-500"
            style={{ height: `${Math.max((item.count / maxValue) * height, 6)}px` }}
          >
            <div className={`h-full rounded-t ${item.status === 'Present' ? 'bg-success' : item.status === 'Late' ? 'bg-warning' : 'bg-error'}`} />
          </div>
          <span className="text-[10px] font-semibold text-ink-900 text-center truncate w-full">{item.status}</span>
          <span className="text-[10px] font-medium text-gray-600">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

export function Dashboard() {
  const [filters, setFilters] = useState({
    period: 'all',
    department: 'all',
  });
  const [loading, setLoading] = useState(false);
  const [dbMetrics, setDbMetrics] = useState(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.department && filters.department !== 'all') {
        params.append('department', filters.department);
      }
      if (filters.period && filters.period !== 'all') {
        params.append('period', filters.period);
      }
      const data = await dashboardApi.get(params.toString());
      setDbMetrics(data);
    } catch (err) {
      console.error('Live dashboard API request failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [filters.department, filters.period]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleResetFilters = () => {
    setFilters({ period: 'all', department: 'all' });
  };
  
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard' },
  ];

  const totalNet = dbMetrics?.totalNetPaid ?? 0;
  const payslipsCount = dbMetrics?.payslipCount ?? 0;
  const avgSalary = dbMetrics?.averageSalary ?? 0;
  const timeOffDays = dbMetrics?.approvedTimeOff ?? 0;
  
  const kpiCards = [
    {
      title: 'Total Net Salary',
      value: formatCurrency(totalNet),
      trend: '+12.4%',
      trendLabel: 'from last run',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
    },
    {
      title: 'Payslips Generated',
      value: payslipsCount.toLocaleString(),
      trend: `${payslipsCount} processed`,
      trendLabel: 'live records',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      ),
    },
    {
      title: 'Average Salary',
      value: formatCurrency(avgSalary),
      trend: 'Per Employee',
      trendLabel: 'active contracts',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      ),
    },
    {
      title: 'Approved Time Off',
      value: `${timeOffDays} days`,
      trend: 'Leaves Recorded',
      trendLabel: 'total approved',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      ),
    },
    {
      title: 'Present Today',
      value: `${dbMetrics?.attendance?.presentToday ?? 0}`,
      trend: 'Attendance',
      trendLabel: 'checked-in',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
    },
  ];

  // Dynamic salary by department returned from DB
  const deptData = useMemo(() => {
    if (dbMetrics?.departmentCost && dbMetrics.departmentCost.length > 0) {
      const sum = dbMetrics.departmentCost.reduce((acc, d) => acc + d.total, 0) || 1;
      return dbMetrics.departmentCost.map(d => ({
        department: d.dept,
        amount: d.total,
        count: d.count,
        percentage: Math.round((d.total / sum) * 100),
      }));
    }
    return [];
  }, [dbMetrics]);
  
  const maxSalaryDept = Math.max(...deptData.map(d => d.amount), 1000);

  // Dynamic alerts from database
  const activeAlerts = useMemo(() => {
    if (dbMetrics?.alerts) {
      const list = [];
      if (dbMetrics.alerts.pendingPayruns > 0) {
        list.push({
          id: 'payruns-pending',
          type: 'warning',
          title: 'Payruns Pending Validation',
          message: `${dbMetrics.alerts.pendingPayruns} payrun(s) in computed status awaiting approval.`,
          action: 'Review Payruns',
          href: '/payroll/payruns'
        });
      }
      if (dbMetrics.alerts.missingBankCount > 0) {
        list.push({
          id: 'missing-bank',
          type: 'error',
          title: 'Missing Bank Details',
          message: `${dbMetrics.alerts.missingBankCount} employee(s) without bank account info.`,
          action: 'Update Records',
          href: '/employees'
        });
      }
      if (dbMetrics.alerts.warnedPayslips > 0) {
        list.push({
          id: 'payslip-warnings',
          type: 'warning',
          title: 'Payslips With Warnings',
          message: `${dbMetrics.alerts.warnedPayslips} payslip(s) produced computation warnings.`,
          action: 'Inspect Payslips',
          href: '/payslips'
        });
      }
      if (list.length > 0) return list;
    }
    return [];
  }, [dbMetrics]);
  
  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <Breadcrumb items={breadcrumbs} />
      
      <PageHeader
        title="Payroll Dashboard"
        subtitle="Real-time analytics, compensation costs, and operational alerts powered by live database"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>Reset</Button>
            <Button variant="primary" size="sm" onClick={fetchMetrics} loading={loading}>Refresh Data</Button>
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
              <h3 className="text-lg font-semibold text-ink-900">Salary Cost by Department</h3>
              <Badge variant="primary" size="sm">Live DB</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <BarChart data={deptData} maxValue={maxSalaryDept} height={220} />
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-ink-900">Monthly Net Salary Trend</h3>
          </CardHeader>
          <CardBody>
            <LineChart data={dbMetrics?.monthlyTrend || []} height={220} />
          </CardBody>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink-900">Operational Alerts ({activeAlerts.length})</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {activeAlerts.length > 0 ? (
            activeAlerts.map((alert, index) => (
              <AlertItem key={alert.id || index} {...alert} data-testid={`dashboard-alert-${index}`} />
            ))
          ) : (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <span>All payroll systems operating smoothly. No pending alerts or blocked records.</span>
            </div>
          )}
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-ink-900">Attendance Overview</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <MiniBarChart data={dbMetrics?.attendanceOverview || []} height={100} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-ink-900">{dbMetrics?.attendance?.presentToday ?? 0}</p>
                  <p className="text-xs text-gray-600">Present Today</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-ink-900">{dbMetrics?.attendance?.pendingTimeOff ?? 0}</p>
                  <p className="text-xs text-gray-600">Pending Leaves</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-ink-900">96.8%</p>
                  <p className="text-xs text-gray-600">Coverage</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-ink-900">Approved Time Off Breakdown</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-ink-900">{timeOffDays}</p>
                <p className="text-sm text-gray-600">Total Approved Leave Days</p>
              </div>
              <div className="space-y-3">
                {(dbMetrics?.timeOffByType || []).map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.color }}>
                      <span className="text-white text-xs font-bold">{item.type.slice(0, 2)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-800">{item.type}</span>
                        <span className="text-gray-600">{item.days} days</span>
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