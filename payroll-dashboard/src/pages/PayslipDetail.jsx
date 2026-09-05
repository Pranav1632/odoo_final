// src/pages/PayslipDetail.jsx
import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Breadcrumb 
} from '../components/UI';
import { payslipsApi } from '../lib/api';

export function PayslipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [dbPayslip, setDbPayslip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    payslipsApi.getById(id)
      .then(data => {
        if (isMounted && data && data.id) {
          setDbPayslip({
            id: data.id,
            payrunId: data.payrun?.id || data.payrunId,
            payrunName: data.payrun?.name || 'Payroll',
            periodStart: data.payrun?.periodStart?.split('T')[0] || '2026-08-01',
            periodEnd: data.payrun?.periodEnd?.split('T')[0] || '2026-08-31',
            employee: {
              fullName: data.employee?.name || 'Employee',
              employeeId: data.employee?.id || data.employeeId,
              departmentId: data.employee?.department || 'General',
            },
            department: data.employee?.department || 'General',
            workedDays: data.workedDays ?? 30,
            status: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase() : 'Draft',
            warnings: data.warnings || [],
            lineItems: (data.lines || []).map(l => ({
              category: l.category,
              label: `${l.name} (${l.code})`,
              amount: l.amount,
            })),
          });
        }
      })
      .catch(err => {
        console.error('API payslip fetch failed:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [id]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await payslipsApi.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('PDF download API failed, using print dialog:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const formatINR = (amt) => {
    return `₹${Number(amt).toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl" data-testid="payslip-detail-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Payslips', href: '/payslips' },
          { label: 'Loading...' },
        ]} />
        <Card>
          <CardBody className="py-12 text-center text-gray-500">
            Loading payslip details...
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!dbPayslip) {
    return (
      <div className="space-y-6 max-w-4xl" data-testid="payslip-detail-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Payslips', href: '/payslips' },
          { label: 'Not Found' },
        ]} />
        <Card>
          <CardBody className="py-12 text-center text-gray-500">
            Payslip not found.
            <div className="mt-4">
              <Button variant="secondary" onClick={() => navigate('/payslips')}>Back to Payslips</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const basicItems = dbPayslip.lineItems.filter(i => i.category === 'Basic');
  const allowanceItems = dbPayslip.lineItems.filter(i => i.category === 'Allowance');
  const grossItems = dbPayslip.lineItems.filter(i => i.category === 'Gross');
  const deductionItems = dbPayslip.lineItems.filter(i => i.category === 'Deduction');
  const netItems = dbPayslip.lineItems.filter(i => i.category === 'Net');

  return (
    <div className="space-y-6 max-w-4xl" data-testid="payslip-detail-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Payruns', href: '/payroll/payruns' },
        { label: dbPayslip.payrunName, href: `/payroll/payruns/${dbPayslip.payrunId}` },
        { label: `Payslip: ${dbPayslip.employee.fullName}` },
      ]} />

      <PageHeader
        title={`Payslip — ${dbPayslip.employee.fullName}`}
        subtitle={`${dbPayslip.payrunName} · Period: ${dbPayslip.periodStart} to ${dbPayslip.periodEnd}`}
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              onClick={() => navigate(`/payroll/payruns/${dbPayslip.payrunId}`)}
            >
              ← Back to Payrun
            </Button>
            <Button 
              variant="primary" 
              onClick={handleDownloadPdf}
              loading={downloading}
            >
              Download PDF
            </Button>
          </div>
        }
      />

      {/* Header section */}
      <Card>
        <CardBody className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Employee Name</p>
              <p className="font-bold text-gray-900 mt-0.5">{dbPayslip.employee.fullName}</p>
              <p className="text-xs text-gray-400">{dbPayslip.employee.employeeId}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Department</p>
              <p className="font-semibold text-gray-900 mt-0.5 capitalize">{dbPayslip.employee.departmentId || dbPayslip.department}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Worked Days</p>
              <p className="font-semibold text-gray-900 mt-0.5">{dbPayslip.workedDays} Days</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Status</p>
              <Badge variant={dbPayslip.status === 'Paid' ? 'success' : 'info'} className="mt-0.5">
                {dbPayslip.status}
              </Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Warnings Banner */}
      {dbPayslip.warnings?.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
          <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
            Payslip Warnings
          </h4>
          {dbPayslip.warnings.map((w, idx) => (
            <p key={idx} className="text-xs text-amber-700 ml-6">• {w}</p>
          ))}
        </div>
      )}

      {/* Salary Computation Breakdown */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Salary Computation</h3>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-gray-100">
            {/* 1. BASIC SALARY */}
            <div className="p-4 bg-cream/40">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Basic Salary</p>
              {basicItems.length > 0 ? basicItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-sm">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="font-mono font-medium text-gray-900">{formatINR(item.amount)}</span>
                </div>
              )) : <span className="text-xs text-gray-400">No basic salary item</span>}
            </div>

            {/* 2. ALLOWANCES */}
            <div className="p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Allowances</p>
              {allowanceItems.length > 0 ? allowanceItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-sm">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="font-mono font-medium text-gray-900">{formatINR(item.amount)}</span>
                </div>
              )) : <span className="text-xs text-gray-400">No allowances</span>}
            </div>

            {/* 3. GROSS SALARY */}
            <div className="p-4 bg-cream/30">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gross Salary</p>
              {grossItems.length > 0 ? grossItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-sm font-semibold">
                  <span className="text-gray-900">{item.label}</span>
                  <span className="font-mono text-gray-900">{formatINR(item.amount)}</span>
                </div>
              )) : <span className="text-xs text-gray-400">No gross line</span>}
            </div>

            {/* 4. DEDUCTIONS */}
            <div className="p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deductions</p>
              {deductionItems.length > 0 ? deductionItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-sm text-red-600">
                  <span>{item.label}</span>
                  <span className="font-mono">- {formatINR(item.amount)}</span>
                </div>
              )) : <span className="text-xs text-gray-400">No deductions</span>}
            </div>

            {/* 5. NET SALARY */}
            <div className="p-6 bg-accent-50/60 rounded-b-2xl">
              <p className="text-xs font-bold text-accent-700 uppercase tracking-wider mb-1">Net Salary</p>
              {netItems.length > 0 ? netItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-lg">
                  <span className="font-bold text-gray-900">{item.label}</span>
                  <span className="font-mono font-extrabold text-2xl text-accent-600">
                    {formatINR(item.amount)}
                  </span>
                </div>
              )) : (
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold text-gray-900">Total Net</span>
                  <span className="font-mono font-extrabold text-2xl text-accent-600">
                    {formatINR(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
