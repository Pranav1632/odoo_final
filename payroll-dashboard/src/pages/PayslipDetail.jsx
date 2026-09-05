// src/pages/PayslipDetail.jsx
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Breadcrumb 
} from '../components/UI';
import { payruns, employees } from '../data/mockData';

export function PayslipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  // Locate the payslip across all payruns
  const payslipData = useMemo(() => {
    for (const pr of payruns) {
      const match = pr.payslips?.find(p => p.id === id);
      if (match) {
        const emp = employees.find(e => e.id === match.employeeId);
        return {
          ...match,
          payrunId: pr.id,
          payrunName: pr.name,
          periodStart: pr.periodStart,
          periodEnd: pr.periodEnd,
          employee: emp || { fullName: 'Employee', departmentId: match.department },
          workedDays: 22,
          warnings: match.warnings || (match.employeeId === 'emp-009' ? ['Missing bank account details'] : []),
          // Calculation line items
          lineItems: [
            { category: 'Basic', label: 'Basic Salary', amount: match.basic || 120000 },
            { category: 'Allowance', label: 'House Rent Allowance (HRA)', amount: Math.round((match.basic || 120000) * 0.4) },
            { category: 'Allowance', label: 'Transport Allowance (TA)', amount: 5000 },
            { category: 'Gross', label: 'Gross Salary', amount: match.gross || 173000 },
            { category: 'Deduction', label: 'Provident Fund (PF)', amount: Math.round((match.basic || 120000) * 0.12) },
            { category: 'Deduction', label: 'Professional Tax (PT)', amount: 200 },
            { category: 'Net', label: 'Net Salary', amount: match.net || 158400 },
          ]
        };
      }
    }
    // Fallback template for any id passed
    const defaultEmp = employees[0];
    return {
      id: id || 'ps-001',
      payrunId: 'pr-001',
      payrunName: 'August 2025 Payroll',
      periodStart: '2025-08-01',
      periodEnd: '2025-08-31',
      employee: defaultEmp,
      department: defaultEmp.departmentId,
      workedDays: 22,
      status: 'Validated',
      warnings: [],
      lineItems: [
        { category: 'Basic', label: 'Basic Salary', amount: 30000 },
        { category: 'Allowance', label: 'House Rent Allowance (HRA)', amount: 6000 },
        { category: 'Gross', label: 'Gross Salary', amount: 36000 },
        { category: 'Deduction', label: 'Provident Fund (PF)', amount: 3600 },
        { category: 'Net', label: 'Net Salary', amount: 32400 },
      ]
    };
  }, [id]);

  const handleDownloadPdf = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      window.print();
    }, 400);
  };

  const formatINR = (amt) => {
    return `₹${Number(amt).toLocaleString('en-IN')}`;
  };

  // Group line items by category in exact order: Basic -> Allowance -> Gross -> Deduction -> Net
  const basicItems = payslipData.lineItems.filter(i => i.category === 'Basic');
  const allowanceItems = payslipData.lineItems.filter(i => i.category === 'Allowance');
  const grossItems = payslipData.lineItems.filter(i => i.category === 'Gross');
  const deductionItems = payslipData.lineItems.filter(i => i.category === 'Deduction');
  const netItems = payslipData.lineItems.filter(i => i.category === 'Net');

  return (
    <div className="space-y-6 max-w-4xl" data-testid="payslip-detail-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Payroll', href: '/payroll/payruns' },
        { label: payslipData.payrunName, href: `/payroll/payruns/${payslipData.payrunId}` },
        { label: `Payslip: ${payslipData.employee.fullName}` },
      ]} />

      <PageHeader
        title={`Payslip — ${payslipData.employee.fullName}`}
        subtitle={`${payslipData.payrunName} · Period: ${payslipData.periodStart} to ${payslipData.periodEnd}`}
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              onClick={() => navigate(`/payroll/payruns/${payslipData.payrunId}`)}
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
              <p className="font-bold text-gray-900 mt-0.5">{payslipData.employee.fullName}</p>
              <p className="text-xs text-gray-400">{payslipData.employee.employeeId || payslipData.employeeId}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Department</p>
              <p className="font-semibold text-gray-900 mt-0.5 capitalize">{payslipData.employee.departmentId || payslipData.department}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Worked Days</p>
              <p className="font-semibold text-gray-900 mt-0.5">{payslipData.workedDays} Days</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Status</p>
              <Badge variant={payslipData.status === 'Paid' ? 'success' : 'info'} className="mt-0.5">
                {payslipData.status || 'Validated'}
              </Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Warnings Banner */}
      {payslipData.warnings?.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
          <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
            Payslip Warnings
          </h4>
          {payslipData.warnings.map((w, idx) => (
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
              {basicItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-sm">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="font-mono font-medium text-gray-900">{formatINR(item.amount)}</span>
                </div>
              ))}
            </div>

            {/* 2. ALLOWANCES */}
            <div className="p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Allowances</p>
              {allowanceItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-sm">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="font-mono font-medium text-gray-900">{formatINR(item.amount)}</span>
                </div>
              ))}
            </div>

            {/* 3. GROSS SALARY */}
            <div className="p-4 bg-cream/30">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gross Salary</p>
              {grossItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-sm font-semibold">
                  <span className="text-gray-900">{item.label}</span>
                  <span className="font-mono text-gray-900">{formatINR(item.amount)}</span>
                </div>
              ))}
            </div>

            {/* 4. DEDUCTIONS */}
            <div className="p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deductions</p>
              {deductionItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-sm text-red-600">
                  <span>{item.label}</span>
                  <span className="font-mono">- {formatINR(item.amount)}</span>
                </div>
              ))}
            </div>

            {/* 5. NET SALARY */}
            <div className="p-6 bg-accent-50/60 rounded-b-2xl">
              <p className="text-xs font-bold text-accent-700 uppercase tracking-wider mb-1">Net Salary</p>
              {netItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-lg">
                  <span className="font-bold text-gray-900">{item.label}</span>
                  <span className="font-mono font-extrabold text-2xl text-accent-600">
                    {formatINR(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
