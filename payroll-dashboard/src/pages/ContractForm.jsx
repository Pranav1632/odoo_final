// src/pages/ContractForm.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Input, Select, Breadcrumb 
} from '../components/UI';
import { contractsApi, employeesApi, salaryStructuresApi } from '../lib/api';

const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Human Resources',
  'Operations',
  'Finance',
  'Sales',
];

const POSITIONS = [
  'Software Engineer',
  'Senior Software Engineer',
  'Lead Software Engineer',
  'Product Manager',
  'UI/UX Designer',
  'Marketing Manager',
  'Content Specialist',
  'HR Manager',
  'Recruiter',
  'Operations Manager',
  'Finance Manager',
  'Accountant',
  'Sales Representative',
  'Account Executive',
];

export function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new');

  const [employeeList, setEmployeeList] = useState([]);
  const [structureList, setStructureList] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [wage, setWage] = useState('120000');
  const [department, setDepartment] = useState('Engineering');
  const [position, setPosition] = useState('Software Engineer');
  const [salaryStructureId, setSalaryStructureId] = useState('');
  const [status, setStatus] = useState('active');
  const [contractCode, setContractCode] = useState('');
  const [error409, setError409] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      employeesApi.getAll().catch(() => []),
      salaryStructuresApi.getAll().catch(() => []),
      isEdit ? contractsApi.getById(id).catch(() => null) : Promise.resolve(null),
    ]).then(([employees, structures, contract]) => {
      if (!isMounted) return;

      const empArr = Array.isArray(employees) ? employees : [];
      setEmployeeList(empArr);

      const structArr = Array.isArray(structures) ? structures : [];
      setStructureList(structArr);

      if (contract) {
        setEmployeeId(contract.employeeId || '');
        setStartDate(contract.startDate ? contract.startDate.split('T')[0] : '');
        setEndDate(contract.endDate ? contract.endDate.split('T')[0] : '');
        setWage(contract.wage ? contract.wage.toString() : '120000');
        setDepartment(contract.department || 'Engineering');
        setPosition(contract.position || 'Software Engineer');
        setSalaryStructureId(contract.salaryStructureId || (structArr[0]?.id || ''));
        setStatus(contract.status ? contract.status.toLowerCase() : 'active');
        setContractCode(contract.id);
      } else {
        if (empArr.length > 0) setEmployeeId(empArr[0].id);
        if (structArr.length > 0) setSalaryStructureId(structArr[0].id);
        setStartDate(new Date().toISOString().split('T')[0]);
      }
    }).finally(() => {
      if (isMounted) setInitialLoading(false);
    });

    return () => { isMounted = false; };
  }, [id, isEdit]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError409('');

    if (!employeeId) {
      setError409('Please select an employee.');
      return;
    }
    if (!salaryStructureId) {
      setError409('Please select a salary structure.');
      return;
    }
    if (!startDate) {
      setError409('Start date is required.');
      return;
    }
    if (!wage || Number(wage) <= 0) {
      setError409('Valid wage amount is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employeeId,
        startDate,
        endDate: endDate ? endDate : null,
        wage: Number(wage),
        department,
        position,
        salaryStructureId,
        status: status.toLowerCase(),
      };

      if (isEdit) {
        await contractsApi.update(id, payload);
      } else {
        await contractsApi.create(payload);
      }
      navigate('/contracts');
    } catch (err) {
      setError409(err.message || 'Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6 max-w-4xl" data-testid="contract-form-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Contracts', href: '/contracts' },
          { label: 'Loading...' },
        ]} />
        <Card>
          <CardBody className="py-12 text-center text-gray-500">
            Loading contract form details...
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" data-testid="contract-form-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Contracts', href: '/contracts' },
        { label: isEdit ? `Contract: ${contractCode || id}` : 'New Contract' },
      ]} />

      <PageHeader
        title={isEdit ? `Edit Contract: ${contractCode || id}` : 'New Employee Contract'}
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
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="font-semibold">Contract Error</p>
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
              options={employeeList.map(e => ({ value: e.id, label: `${e.name} (${e.department})` }))}
              required
            />
            <Select
              label="Contract Status *"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'draft', label: 'Draft' },
                { value: 'expired', label: 'Expired' },
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
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
              required
            />
            <Select
              label="Job Position *"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              options={POSITIONS.map(p => ({ value: p, label: p }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Salary Structure *"
              value={salaryStructureId}
              onChange={(e) => setSalaryStructureId(e.target.value)}
              options={structureList.map(s => ({ value: s.id, label: s.name }))}
              required
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
