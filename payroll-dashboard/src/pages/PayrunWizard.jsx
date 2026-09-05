// src/pages/PayrunWizard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, CardBody, PageHeader, Button, Select, Input, Badge, Avatar, Breadcrumb, Modal 
} from '../components/UI';
import { salaryStructuresApi, payrunsApi, employeesApi } from '../lib/api';

const wizardSteps = [
  { id: 1, label: 'Define Scope' },
  { id: 2, label: 'Select Employees' },
];

export function PayrunWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    salaryStructureId: '',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
  });
  const [structures, setStructures] = useState([]);
  const [dbEmployees, setDbEmployees] = useState([]);
  const [eligibleIds, setEligibleIds] = useState(null); // null = not loaded yet
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [discardModal, setDiscardModal] = useState(false);

  useEffect(() => {
    salaryStructuresApi.getAll()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setStructures(data);
          setFormData(prev => ({
            ...prev,
            salaryStructureId: prev.salaryStructureId || data[0].id,
          }));
        }
      })
      .catch(() => {});

    employeesApi.getAll()
      .then(data => {
        if (Array.isArray(data)) setDbEmployees(data);
      })
      .catch(() => {});
  }, []);

  // Real, period-aware eligibility — matches exactly what the backend will use to
  // attach payslips, instead of a local heuristic based only on contract status.
  useEffect(() => {
    if (step !== 2 || !formData.periodStart || !formData.periodEnd) return;
    let cancelled = false;
    setEligibilityLoading(true);
    payrunsApi
      .getEligibleEmployeesForPeriod(
        new Date(formData.periodStart).toISOString(),
        new Date(formData.periodEnd).toISOString()
      )
      .then(data => {
        if (cancelled) return;
        const ids = new Set(Array.isArray(data) ? data.map(e => e.id) : []);
        setEligibleIds(ids);
        setSelectedEmployees(prev => (prev.length > 0 ? prev : [...ids]));
      })
      .catch(() => {
        if (!cancelled) setEligibleIds(new Set());
      })
      .finally(() => {
        if (!cancelled) setEligibilityLoading(false);
      });
    return () => { cancelled = true; };
  }, [step, formData.periodStart, formData.periodEnd]);

  const selectedStructure = structures.find(s => s.id === formData.salaryStructureId);
  const structureRules = selectedStructure?.rules?.length || 0;

  const eligibleEmployees = useMemo(() => {
    return dbEmployees.map(emp => {
      const hasActive = eligibleIds ? eligibleIds.has(emp.id) : false;
      return {
        ...emp,
        fullName: emp.name || emp.fullName,
        departmentId: emp.department || 'General',
        hasValidContract: hasActive,
        contractWarning: !hasActive ? 'No contract covers this period' : null,
      };
    });
  }, [dbEmployees, eligibleIds]);

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

  const handleNext = async () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
      return;
    }
    // Step 2 submit
    if (selectedEmployees.length === 0) {
      setErrors({ employees: 'Please select at least one employee' });
      return;
    }
    setLoading(true);
    try {
      const newPayrun = await payrunsApi.create({
        name: formData.name,
        periodStart: new Date(formData.periodStart).toISOString(),
        periodEnd: new Date(formData.periodEnd).toISOString(),
        salaryStructureId: formData.salaryStructureId,
      });

      if (newPayrun && newPayrun.id) {
        let attachNotice = null;
        try {
          const summary = await payrunsApi.attachEmployees(newPayrun.id, selectedEmployees);
          if (summary?.skipped > 0) {
            // Employee selection can go stale between loading eligibility and submitting
            // (e.g. a contract expired in the meantime) — surface it rather than silently
            // creating a payrun with fewer payslips than employees selected.
            attachNotice = `${summary.skipped} of ${selectedEmployees.length} selected employee(s) were skipped — no contract covers this payrun's period.`;
          }
        } catch (e) {
          console.warn('Attach employees failed:', e);
          attachNotice = e.message || 'Failed to attach selected employees.';
        }
        navigate(`/payroll/payruns/${newPayrun.id}`, { replace: true, state: attachNotice ? { attachNotice } : undefined });
      } else {
        navigate('/payroll/payruns', { replace: true });
      }
    } catch (err) {
      console.error('Payrun create failed:', err);
      setErrors({ form: err.message || 'Failed to create payrun' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
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
                options={structures.map(s => ({ value: s.id, label: s.name }))}
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
                  {eligibilityLoading
                    ? 'Checking contract eligibility for this period…'
                    : <>Selected: <strong>{selectedCount}</strong> of {eligibleCount} eligible employees</>}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={eligibilityLoading}>
                  {selectedCount === eligibleCount ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {errors.employees && (
                <p className="text-xs text-red-600">{errors.employees}</p>
              )}

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {eligibleEmployees.map(emp => (
                  <label 
                    key={emp.id} 
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedEmployees.includes(emp.id) ? 'bg-cream border-accent-500/40 shadow-soft' : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(emp.id)}
                      onChange={() => handleEmployeeToggle(emp.id)}
                      className="w-4 h-4 text-accent-600 rounded border-gray-300 focus:ring-accent-500"
                    />
                    <Avatar name={emp.fullName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{emp.fullName}</p>
                      <p className="text-xs text-gray-500">{emp.departmentId}</p>
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