// src/pages/ScheduleForm.jsx
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Input, Breadcrumb 
} from '../components/UI';
import { schedulesApi } from '../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function ScheduleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new');

  const [name, setName] = useState('');
  const [type, setType] = useState('Fixed');
  const [days, setDays] = useState([
    { day: 'Monday', startTime: '09:00', endTime: '18:00', breakMins: 60 },
    { day: 'Tuesday', startTime: '09:00', endTime: '18:00', breakMins: 60 },
    { day: 'Wednesday', startTime: '09:00', endTime: '18:00', breakMins: 60 },
    { day: 'Thursday', startTime: '09:00', endTime: '18:00', breakMins: 60 },
    { day: 'Friday', startTime: '09:00', endTime: '18:00', breakMins: 60 },
  ]);
  const [weeklyHours, setWeeklyHours] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    let isMounted = true;
    schedulesApi.getById(id)
      .then(sched => {
        if (!isMounted || !sched) return;
        setName(sched.name || '');
        setType(sched.type || 'Fixed');
        if (Array.isArray(sched.lines) && sched.lines.length > 0) {
          setDays(sched.lines.map(l => ({
            day: l.day,
            startTime: l.startTime,
            endTime: l.endTime,
            breakMins: l.breakMins ?? 0,
          })));
        }
        if (sched.weeklyHours) {
          setWeeklyHours(`${sched.weeklyHours} hours/week`);
        }
      })
      .catch(err => {
        console.error('Failed to load schedule:', err);
        setError('Failed to load schedule details.');
      })
      .finally(() => {
        if (isMounted) setInitialLoading(false);
      });

    return () => { isMounted = false; };
  }, [id, isEdit]);

  // Client-side computed weekly hours for preview
  const previewWeeklyHours = useMemo(() => {
    let totalMins = 0;
    for (const d of days) {
      if (!d.startTime || !d.endTime) continue;
      const [sh, sm] = d.startTime.split(':').map(Number);
      const [eh, em] = d.endTime.split(':').map(Number);
      const dayMins = (eh * 60 + em) - (sh * 60 + sm) - (Number(d.breakMins) || 0);
      if (dayMins > 0) totalMins += dayMins;
    }
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  }, [days]);

  const handleDayChange = (index, field, value) => {
    setDays(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddDay = () => {
    const unusedDay = DAYS.find(d => !days.some(x => x.day === d)) || 'Monday';
    setDays(prev => [...prev, { day: unusedDay, startTime: '09:00', endTime: '18:00', breakMins: 60 }]);
  };

  const handleRemoveDay = (index) => {
    setDays(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Schedule name is required.');
      return;
    }
    if (days.length === 0) {
      setError('At least one working day is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        type,
        lines: days.map(d => ({
          day: d.day,
          startTime: d.startTime,
          endTime: d.endTime,
          breakMins: Number(d.breakMins) || 0,
        })),
      };

      if (isEdit) {
        await schedulesApi.update(id, payload);
      } else {
        await schedulesApi.create(payload);
      }
      navigate('/schedules');
    } catch (err) {
      console.error('Failed to save schedule:', err);
      setError(err.message || 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6 max-w-4xl" data-testid="schedule-form-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Working Schedules', href: '/schedules' },
          { label: 'Loading...' },
        ]} />
        <Card>
          <CardBody className="py-12 text-center text-gray-500">
            Loading schedule details...
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" data-testid="schedule-form-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Working Schedules', href: '/schedules' },
        { label: isEdit ? `Edit: ${name || id}` : 'New Schedule' },
      ]} />

      <PageHeader
        title={isEdit ? `Edit Schedule: ${name}` : 'New Working Schedule'}
        subtitle="Define working hours, days of the week, and expected daily duration"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/schedules')}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={loading}>Save Schedule</Button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm" role="alert">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="font-semibold">Schedule Error</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Schedule Details</h3>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Schedule Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard 40h"
              required
            />
            <Input
              label="Schedule Type *"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. Fixed, Flexible, Shift"
              required
            />
          </div>

          <div className="p-4 bg-cream rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Weekly Hours Preview</p>
              <p className="text-xl font-bold text-gray-900">
                {weeklyHours || `${previewWeeklyHours} / week`}
              </p>
            </div>
            <span className="text-xs text-gray-500 max-w-xs text-right">
              Official weekly hours stored and computed from working schedule lines
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900">Working Days Grid</h4>
              <Button variant="secondary" size="sm" onClick={handleAddDay}>
                + Add Day
              </Button>
            </div>

            <div className="space-y-3">
              {days.map((row, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-36">
                    <select
                      value={row.day}
                      onChange={(e) => handleDayChange(idx, 'day', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm"
                    >
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">From</span>
                    <input
                      type="time"
                      value={row.startTime}
                      onChange={(e) => handleDayChange(idx, 'startTime', e.target.value)}
                      className="bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">To</span>
                    <input
                      type="time"
                      value={row.endTime}
                      onChange={(e) => handleDayChange(idx, 'endTime', e.target.value)}
                      className="bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Break (min)</span>
                    <input
                      type="number"
                      value={row.breakMins}
                      onChange={(e) => handleDayChange(idx, 'breakMins', e.target.value)}
                      className="w-20 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDay(idx)}
                    className="ml-auto text-gray-400 hover:text-error p-1.5 rounded-full hover:bg-white"
                    title="Remove day"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
