// src/pages/ContractForm.jsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Input, Select, Breadcrumb 
} from '../components/UI';
import { contracts, employees, departments, jobPositions, salaryStructures } from '../data/mockData';

export function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new');

  const existing = useMemo(() => {
    return isEdit ? contracts.find(c => c.id === id || c.contractId === id) : null;
  }, [id, isEdit]);

  const [employeeId, setEmployeeId] = useState(existing?.employeeId || 'emp-001');
  const [startDate, setStartDate] = useState(existing?.startDate || '2025-01-01');
  const [endDate, setEndDate] = useState(existing?.endDate || '');
  const [wage, setWage] = useState(existing?.wage?.toString() || existing?.wageAmount?.toString() || '120000');
  const [departmentId, setDepartmentId] = useState(existing?.departmentId || 'eng');
  const [jobPositionId, setJobPositionId] = useState(existing?.jobPositionId || 'senior-se');
  const [salaryStructureId, setSalaryStructureId] = useState(existing?.salaryStructureId || 'struct-001');
  const [status, setStatus] = useState(existing?.status || 'Active');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [error409, setError409] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setError409('');

    // Check 409 conflict: overlapping active contract for same employee
    if (status === 'Active') {
      const activeOverlap = contracts.find(c => 
        c.employeeId === employeeId && 
        c.status === 'Active' && 
        c.id !== id && 
        c.contractId !== id
      );
      if (activeOverlap && !isEdit) {
        setError409(`Conflict (409): Employee already has an active contract (${activeOverlap.contractId}). Please expire or modify the existing contract first.`);
        return;
      }
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/contracts');
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-4xl" data-testid="contract-form-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Contracts', href: '/contracts' },
        { label: isEdit ? `Contract: ${existing?.contractId || id}` : 'New Contract' },
      ]} />

      <PageHeader
        title={isEdit ? `Edit Contract: ${existing?.contractId || id}` : 'New Employee Contract'}
        subtitle="Specify employment terms, compensation amount, and associated salary calculation structure"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/contracts')}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={loading}>Save Contract</Button>
          </div>
        }
      />

      {error409 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm" role="alert">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          <div>
            <p className="font-semibold">Contract Overlap Error</p>
            <p className="text-xs text-red-700 mt-0.5">{error409}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Contract Terms</h3>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Employee *"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              options={employees.map(e => ({ value: e.id, label: `${e.fullName} (${e.employeeId})` }))}
              required
            />
            <Select
              label="Contract Status *"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Expired', label: 'Expired' },
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date *"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date (Leave blank for permanent/ongoing)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Wage (₹ / Month) *"
              type="number"
              value={wage}
              onChange={(e) => setWage(e.target.value)}
              placeholder="120000"
              required
            />
            <Select
              label="Department *"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={departments.map(d => ({ value: d.id, label: d.name }))}
              required
            />
            <Select
              label="Job Position *"
              value={jobPositionId}
              onChange={(e) => setJobPositionId(e.target.value)}
              options={jobPositions.map(p => ({ value: p.id, label: p.name }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Salary Structure *"
              value={salaryStructureId}
              onChange={(e) => setSalaryStructureId(e.target.value)}
              options={salaryStructures.map(s => ({ value: s.id, label: s.name }))}
              required
            />
            <Input
              label="Internal Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Standard probation period applies"
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
