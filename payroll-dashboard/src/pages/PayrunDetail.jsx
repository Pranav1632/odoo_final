// src/pages/PayrunDetail.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Avatar, Breadcrumb, Table 
} from '../components/UI';
import { 
  payruns as initialPayruns, employees, salaryStructures, formatDate, getStatusColor
} from '../data/mockData';

export function PayrunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [allPayruns, setAllPayruns] = useState(initialPayruns);
  const [computing, setComputing] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const payrun = useMemo(() => {
    return allPayruns.find(p => p.id === id) || allPayruns[0];
  }, [allPayruns, id]);

  const structure = useMemo(() => {
    return salaryStructures.find(s => s.id === payrun.salaryStructureId);
  }, [payrun]);

  // Polling simulation for compute (Task 11 requirement: 2 second poll until status is 'computed')
  useEffect(() => {
    let pollTimer;
    if (computing) {
      pollTimer = setTimeout(() => {
        setAllPayruns(prev => prev.map(p => {
          if (p.id === payrun.id) {
            return {
              ...p,
              status: 'Computed',
            };
          }
          return p;
        }));
        setComputing(false);
      }, 2000);
    }
    return () => clearTimeout(pollTimer);
  }, [computing, payrun.id]);

  const handleCompute = () => {
    setComputing(true);
  };

  const handleValidate = () => {
    setActionLoading('validate');
    setTimeout(() => {
      setAllPayruns(prev => prev.map(p => p.id === payrun.id ? { ...p, status: 'Validated' } : p));
      setActionLoading('');
    }, 600);
  };

  const handleMarkPaid = () => {
    setActionLoading('mark-paid');
    setTimeout(() => {
      setAllPayruns(prev => prev.map(p => p.id === payrun.id ? { ...p, status: 'Paid' } : p));
      setActionLoading('');
    }, 600);
  };

  const handleSendPayslips = () => {
    setActionLoading('send');
    setTimeout(() => {
      alert(`Payslips queued for dispatch to ${payrun.payslips?.length || 0} employees.`);
      setActionLoading('');
    }, 600);
  };

  const handleDownloadExcel = () => {
    // ponytail: triggers CSV/Excel download
    const rows = [
      ['Employee', 'Department', 'Basic', 'Gross', 'Deductions', 'Net', 'Status'],
      ...(payrun.payslips || []).map(p => {
        const emp = employees.find(e => e.id === p.employeeId);
        return [emp?.fullName || p.employeeId, p.department, p.basic, p.gross, p.deductions, p.net, p.status];
      })
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${payrun.name.replace(/\s+/g, '_')}_payroll.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const status = payrun.status?.toLowerCase() || 'draft';

  // Warnings list from payrun and payslips
  const payslipWarnings = useMemo(() => {
    return (payrun.warnings || []).map(w => w.message);
  }, [payrun]);

  const columns = [
    { key: 'employee', header: 'Employee', width: '220px', render: (row) => {
      const emp = employees.find(e => e.id === row.employeeId);
      return emp ? (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/payslips/${row.id}`)}>
          <Avatar name={emp.fullName} size="sm" />
          <div>
            <p className="font-semibold text-gray-900 hover:text-accent-600">{emp.fullName}</p>
            <p className="text-xs text-gray-500">{emp.employeeId}</p>
          </div>
        </div>
      ) : '—';
    }},
    { key: 'department', header: 'Department', width: '140px', render: (row) => row.department },
    { key: 'workedDays', header: 'Worked Days', width: '110px', render: () => '22 Days' },
    { key: 'netSalary', header: 'Net Salary', width: '140px', render: (row) => (
      <span className="font-mono font-bold text-gray-900">₹{Number(row.net).toLocaleString('en-IN')}</span>
    )},
    { key: 'status', header: 'Status', width: '110px', render: (row) => (
      <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
    )},
    { key: 'warnings', header: 'Warnings', width: '180px', render: (row) => {
      const isMissingBank = row.employeeId === 'emp-009';
      return isMissingBank ? (
        <span className="text-xs text-amber-600 font-medium">⚠️ Missing bank details</span>
      ) : (
        <span className="text-xs text-emerald-600">✓ Clean</span>
      );
    }},
    { key: 'actions', header: 'View', width: '80px', render: (row) => (
      <Button variant="ghost" size="sm" onClick={() => navigate(`/payslips/${row.id}`)}>
        View
      </Button>
    )},
  ];

  return (
    <div className="space-y-6" data-testid="payrun-processing-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Payroll', href: '/payroll/payruns' },
        { label: payrun.name },
      ]} />

      {/* Top Section */}
      <PageHeader
        title={payrun.name}
        subtitle={`Period: ${formatDate(payrun.periodStart)} – ${formatDate(payrun.periodEnd)} · Structure: ${structure?.name || payrun.salaryStructureId}`}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">Status:</span>
            <Badge variant={getStatusColor(payrun.status)} size="md">{payrun.status}</Badge>
          </div>
        }
      />

      {/* Action Buttons Matrix per Task 11 */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl shadow-soft border border-black/[0.04]">
        {/* Compute: status is draft or computed */}
        {(status === 'draft' || status === 'computed') && (
          <Button
            variant="secondary"
            onClick={handleCompute}
            loading={computing}
            data-testid="payrun-btn-compute"
          >
            ⚙️ {status === 'computed' ? 'Re-Compute Salaries' : 'Compute Salaries'}
          </Button>
        )}

        {/* Validate: status is computed */}
        {status === 'computed' && (
          <Button
            variant="primary"
            onClick={handleValidate}
            loading={actionLoading === 'validate'}
            data-testid="payrun-btn-validate"
          >
            ✓ Validate Payrun
          </Button>
        )}

        {/* Mark Paid: status is validated */}
        {status === 'validated' && (
          <Button
            variant="success"
            onClick={handleMarkPaid}
            loading={actionLoading === 'mark-paid'}
            data-testid="payrun-btn-mark-paid"
          >
            💰 Mark as Paid
          </Button>
        )}

        {/* Send Payslips: status is validated or paid */}
        {(status === 'validated' || status === 'paid') && (
          <Button
            variant="secondary"
            onClick={handleSendPayslips}
            loading={actionLoading === 'send'}
            data-testid="payrun-btn-send-payslips"
          >
            ✉️ Send Payslips
          </Button>
        )}

        {/* Download Excel: always visible */}
        <Button
          variant="secondary"
          onClick={handleDownloadExcel}
          data-testid="payrun-btn-download-excel"
          className="ml-auto"
        >
          📥 Download Excel
        </Button>
      </div>

      {/* Warning Banner per Task 11 */}
      {payslipWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          <div>
            <h4 className="text-sm font-bold text-amber-900">
              {payslipWarnings.length} payslips have operational warnings:
            </h4>
            <div className="mt-1 space-y-0.5">
              {payslipWarnings.map((w, idx) => (
                <p key={idx} className="text-xs text-amber-800">• {w}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payslip List Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Generated Payslips ({payrun.payslips?.length || 0})
          </h3>
          <span className="text-sm font-bold text-gray-900">
            Total Net: ₹{Number(payrun.totalNet || 485000).toLocaleString('en-IN')}
          </span>
        </CardHeader>
        <CardBody className="p-0">
          <Table
            columns={columns}
            data={payrun.payslips || []}
            keyField="id"
            onRowClick={(row) => navigate(`/payslips/${row.id}`)}
            emptyMessage="No payslips generated. Click Compute to generate payslips."
          />
        </CardBody>
      </Card>
    </div>
  );
}