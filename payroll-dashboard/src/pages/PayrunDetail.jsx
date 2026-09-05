// src/pages/PayrunDetail.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Avatar, Breadcrumb, Table 
} from '../components/UI';
import { formatDate, getStatusColor } from '../lib/formatters';
import { payrunsApi, payslipsApi } from '../lib/api';

export function PayrunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [currentPayrun, setCurrentPayrun] = useState(null);
  const [computing, setComputing] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPayrun = async () => {
    try {
      const data = await payrunsApi.getById(id);
      if (data && data.id) {
        setCurrentPayrun({
          ...data,
          status: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase() : 'Draft',
          periodStart: data.periodStart?.split('T')[0] || data.periodStart,
          periodEnd: data.periodEnd?.split('T')[0] || data.periodEnd,
        });
      }
    } catch (err) {
      console.error('API payrun fetch failed:', err);
      setErrorMsg(err.message || 'Failed to load payrun');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrun();
  }, [id]);

  const payrun = currentPayrun;

  const structure = useMemo(() => {
    return payrun?.salaryStructure;
  }, [payrun]);

  const handleCompute = async () => {
    setComputing(true);
    setErrorMsg('');
    try {
      await payrunsApi.compute(id);
      await loadPayrun();
    } catch (err) {
      setErrorMsg(err.message || 'Compute failed');
    } finally {
      setComputing(false);
    }
  };

  const handleValidate = async () => {
    setActionLoading('validate');
    setErrorMsg('');
    try {
      await payrunsApi.validate(id);
      await loadPayrun();
    } catch (err) {
      setErrorMsg(err.message || 'Validation failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleMarkPaid = async () => {
    setActionLoading('mark-paid');
    setErrorMsg('');
    try {
      await payrunsApi.markPaid(id);
      await loadPayrun();
    } catch (err) {
      setErrorMsg(err.message || 'Mark as paid failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleSendPayslips = async () => {
    setActionLoading('send');
    setErrorMsg('');
    try {
      const res = await payrunsApi.sendPayslips(id);
      alert(res.message || 'Payslips queued for dispatch.');
      await loadPayrun();
    } catch (err) {
      setErrorMsg(err.message || 'Send payslips failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const blob = await payslipsApi.exportExcel(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payrun-${id}-payslips.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Excel export failed, falling back to CSV:', err);
      const rows = [
        ['Employee', 'Department', 'Net', 'Status'],
        ...(payrun.payslips || []).map(p => [p.employee?.name || p.employeeId, p.employee?.department || 'General', p.netSalary ?? 0, p.status])
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${payrun.name?.replace(/\s+/g, '_') || 'payrun'}_payroll.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="payrun-processing-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Payruns', href: '/payroll/payruns' },
          { label: 'Loading...' },
        ]} />
        <Card>
          <CardBody className="py-12 text-center text-gray-500">
            Loading payrun details...
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!payrun) {
    return (
      <div className="space-y-6" data-testid="payrun-processing-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Payruns', href: '/payroll/payruns' },
          { label: 'Not Found' },
        ]} />
        <Card>
          <CardBody className="py-12 text-center text-gray-500">
            Payrun not found.
            <div className="mt-4">
              <Button variant="secondary" onClick={() => navigate('/payroll/payruns')}>Back to Payruns</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const status = payrun.status?.toLowerCase() || 'draft';

  const columns = [
    { key: 'employee', header: 'Employee', width: '220px', render: (row) => {
      const empName = row.employee?.name || row.employeeId;
      return (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/payslips/${row.id}`)}>
          <Avatar name={empName} size="sm" />
          <div>
            <p className="font-semibold text-gray-900 hover:text-accent-600">{empName}</p>
            <p className="text-xs text-gray-500 font-mono">{row.employeeId}</p>
          </div>
        </div>
      );
    }},
    { key: 'department', header: 'Department', width: '140px', render: (row) => row.employee?.department || 'General' },
    { key: 'workedDays', header: 'Worked Days', width: '110px', render: (row) => `${row.workedDays ?? 30} Days` },
    { key: 'netSalary', header: 'Net Salary', width: '140px', render: (row) => (
      <span className="font-mono font-bold text-gray-900">₹{Number(row.netSalary ?? 0).toLocaleString('en-IN')}</span>
    )},
    { key: 'status', header: 'Status', width: '110px', render: (row) => (
      <Badge variant={getStatusColor(row.status)}>{row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase() : 'Draft'}</Badge>
    )},
    { key: 'warnings', header: 'Warnings', width: '180px', render: (row) => {
      const warnings = row.warnings || [];
      return warnings.length > 0 ? (
        <span className="text-xs text-amber-600 font-medium">⚠️ {warnings.length} warning(s)</span>
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
        { label: 'Payruns', href: '/payroll/payruns' },
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

      {/* Action Buttons Matrix */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl shadow-soft border border-black/[0.04]">
        {/* Compute: status is draft or computed */}
        {(status === 'draft' || status === 'computed') && (
          <Button
            variant="secondary"
            onClick={handleCompute}
            loading={computing}
            data-testid="compute-button"
          >
            ⚙️ Compute Payroll
          </Button>
        )}

        {/* Validate: status is computed */}
        {status === 'computed' && (
          <Button
            variant="primary"
            onClick={handleValidate}
            loading={actionLoading === 'validate'}
            data-testid="validate-button"
          >
            ✓ Validate Payrun
          </Button>
        )}

        {/* Mark as Paid: status is validated */}
        {status === 'validated' && (
          <Button
            variant="success"
            onClick={handleMarkPaid}
            loading={actionLoading === 'mark-paid'}
            data-testid="mark-paid-button"
          >
            💳 Mark as Paid
          </Button>
        )}

        {/* Send Payslips: status is validated or paid */}
        {(status === 'validated' || status === 'paid') && (
          <Button
            variant="secondary"
            onClick={handleSendPayslips}
            loading={actionLoading === 'send'}
            data-testid="send-payslips-button"
          >
            ✉️ Send Payslips
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={handleDownloadExcel}
          data-testid="export-excel-button"
        >
          📊 Export Excel
        </Button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="font-semibold">Operation Error</p>
            <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Payslips Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Generated Payslips ({payrun.payslips?.length || 0})
          </h3>
        </CardHeader>
        <CardBody className="p-0">
          <Table
            columns={columns}
            data={payrun.payslips || []}
            keyField="id"
            emptyMessage="No payslips generated for this payrun yet. Click 'Compute Payroll' to calculate."
          />
        </CardBody>
      </Card>
    </div>
  );
}