// src/pages/PayrunWizard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, CardBody, PageHeader, Button, Select, Input, Badge, Avatar, Breadcrumb, Modal 
} from '../components/UI';
import { 
  employees, departments, salaryStructures, contracts,
  formatDate
} from '../data/mockData';

const wizardSteps = [
  { id: 1, label: 'Define Scope' },
  { id: 2, label: 'Select Employees' },
];

export function PayrunWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    salaryStructureId: 'struct-001',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
  });
  const [selectedEmployees, setSelectedEmployees] = useState(['emp-001', 'emp-002', 'emp-003']);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [discardModal, setDiscardModal] = useState(false);

  const selectedStructure = salaryStructures.find(s => s.id === formData.salaryStructureId);
  const structureRules = selectedStructure?.rules?.length || 0;

  const eligibleEmployees = useMemo(() => {
    if (!formData.salaryStructureId) return [];
    return employees.map(emp => {
      const contract = contracts.find(c => c.employeeId === emp.id && c.status === 'Active');
      return {
        ...emp,
        hasValidContract: !!contract,
        contractWarning: !contract ? 'No active contract' : null,
      };
    });
  }, [formData.salaryStructureId]);

  const eligibleCount = eligibleEmployees.filter(e => e.hasValidContract).length;
  const selectedCount = selectedEmployees.length;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Payrun name is required';
    if (!formData.salaryStructureId) newErrors.salaryStructureId = 'Salary structure is required';
    if (!formData.periodStart) newErrors.periodStart = 'Period start date is required';
    if (!formData.periodEnd) newErrors.periodEnd = 'Period end date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      handleCreate();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = async () => {
    if (selectedEmployees.length === 0) {
      setErrors({ employees: 'Please select at least one employee' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/payroll/payruns/pr-001', { replace: true });
    }, 800);
  };

  const handleEmployeeToggle = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleSelectAll = () => {
    const eligibleIds = eligibleEmployees.filter(e => e.hasValidContract).map(e => e.id);
    setSelectedEmployees(prev => 
      prev.length === eligibleIds.length ? [] : eligibleIds
    );
  };

  return (
    <div className="space-y-6 max-w-3xl" data-testid="payrun-wizard-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Payroll', href: '/payroll/payruns' },
        { label: 'New Payrun Wizard' },
      ]} />

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Create New Payrun</h2>
          <Button variant="ghost" size="sm" onClick={() => setDiscardModal(true)}>× Close</Button>
        </div>
        <div className="flex items-center gap-2" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={2}>
          {wizardSteps.map((s, index) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index + 1 < step ? 'bg-accent-500 text-white' : index + 1 === step ? 'bg-ink-900 text-white shadow-soft' : 'bg-gray-100 text-gray-400'
                }`}>
                  {index + 1 < step ? '✓' : index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${index + 1 <= step ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
              </div>
              {index < wizardSteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${index + 1 < step ? 'bg-accent-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <Card>
        <CardBody className="p-6">
          {step === 1 && (
            <div data-testid="payrun-wizard-step1" className="space-y-5">
              <h3 className="text-base font-semibold text-gray-900">Step 1: Define Payrun Scope</h3>
              
              <Input
                label="Payrun Name *"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. August 2026 Regular Salary"
                error={errors.name}
                required
              />

              <Select
                label="Salary Structure *"
                value={formData.salaryStructureId}
                onChange={(e) => handleChange('salaryStructureId', e.target.value)}
                options={salaryStructures.map(s => ({ value: s.id, label: s.name }))}
                error={errors.salaryStructureId}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Period Start Date *"
                  type="date"
                  value={formData.periodStart}
                  onChange={(e) => handleChange('periodStart', e.target.value)}
                  error={errors.periodStart}
                  required
                />
                <Input
                  label="Period End Date *"
                  type="date"
                  value={formData.periodEnd}
                  onChange={(e) => handleChange('periodEnd', e.target.value)}
                  error={errors.periodEnd}
                  required
                />
              </div>

              {selectedStructure && (
                <div className="p-4 bg-cream rounded-2xl border border-gray-100 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Structure Summary</p>
                  <p className="text-sm font-medium text-gray-900">{selectedStructure.name} ({structureRules} computation rules)</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div data-testid="payrun-wizard-step2" className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Step 2: Select Eligible Employees</h3>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  Selected: <strong>{selectedCount}</strong> of {eligibleCount} eligible employees
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedCount === eligibleCount ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100 max-h-80 overflow-y-auto bg-white">
                {eligibleEmployees.map(emp => (
                  <label 
                    key={emp.id} 
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-cream/40 transition-colors ${!emp.hasValidContract ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(emp.id)}
                      onChange={() => handleEmployeeToggle(emp.id)}
                      disabled={!emp.hasValidContract}
                      className="w-4 h-4 rounded text-accent-500 focus:ring-accent-500"
                    />
                    <Avatar name={emp.fullName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{emp.fullName}</p>
                      <p className="text-xs text-gray-500">{departments.find(d => d.id === emp.departmentId)?.name}</p>
                    </div>
                    <Badge variant={emp.hasValidContract ? 'success' : 'warning'} size="sm">
                      {emp.hasValidContract ? 'Eligible' : emp.contractWarning}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardBody>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <Button variant="secondary" onClick={handleBack} disabled={step === 1 || loading}>
            ← Back
          </Button>
          <Button 
            variant="primary" 
            onClick={handleNext} 
            loading={loading}
          >
            {step === 1 ? 'Continue →' : `Create Payrun (${selectedCount} employees)`}
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={discardModal}
        onClose={() => setDiscardModal(false)}
        title="Discard Payrun Setup?"
        size="sm"
      >
        <p className="text-gray-600 text-sm">Are you sure you want to discard this setup? Unsaved information will be lost.</p>
        <div className="modal-footer pt-4">
          <Button variant="secondary" onClick={() => setDiscardModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { setDiscardModal(false); navigate('/payroll/payruns'); }}>Discard</Button>
        </div>
      </Modal>
    </div>
  );
}