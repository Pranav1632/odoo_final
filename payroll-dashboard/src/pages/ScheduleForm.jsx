// src/pages/ScheduleForm.jsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Input, Select, Breadcrumb 
} from '../components/UI';
import { schedules } from '../data/mockData';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function ScheduleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new');

  const existing = useMemo(() => {
    return isEdit ? schedules.find(s => s.id === id) : null;
  }, [id, isEdit]);

  const [name, setName] = useState(existing?.name || '');
  const [type, setType] = useState(existing?.type || 'Fixed');
  const [timezone, setTimezone] = useState(existing?.timezone || 'UTC');
  const [days, setDays] = useState([
    { day: 'Monday', startTime: '09:00', endTime: '18:00', breakMins: 60 },
    { day: 'Tuesday', startTime: '09:00', endTime: '18:00', breakMins: 60 },
    { day: 'Wednesday', startTime: '09:00', endTime: '18:00', breakMins: 60 },
    { day: 'Thursday', startTime: '09:00', endTime: '18:00', breakMins: 60 },
    { day: 'Friday', startTime: '09:00', endTime: '18:00', breakMins: 60 },
  ]);
  const [savedWeeklyHours, setSavedWeeklyHours] = useState(existing?.weeklyHours || null);
  const [loading, setLoading] = useState(false);

  // Client-side computed weekly hours for preview only
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
    setDays(prev => [...prev, { day: unusedDay, startTime: '09:00', endTime: '17:00', breakMins: 60 }]);
  };

  const handleRemoveDay = (index) => {
    setDays(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    // ponytail: simulation of save returning weeklyHours
    setTimeout(() => {
      setLoading(false);
      setSavedWeeklyHours(`${previewWeeklyHours}/week`);
      navigate('/schedules');
    }, 600);
  };

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

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Schedule Details</h3>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <Input
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="UTC / Asia/Kolkata"
            />
          </div>

          <div className="p-4 bg-cream rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Weekly Hours Preview</p>
              <p className="text-xl font-bold text-gray-900">
                {savedWeeklyHours || `${previewWeeklyHours} / week`}
              </p>
            </div>
            <span className="text-xs text-gray-500 max-w-xs text-right">
              Official weekly hours stored and displayed from schedule service
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
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
