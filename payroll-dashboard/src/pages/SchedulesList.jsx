// src/pages/SchedulesList.jsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, CardBody, PageHeader, Button, Badge, Input, Table, Breadcrumb 
} from '../components/UI';
import { schedulesApi } from '../lib/api';

export function SchedulesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    schedulesApi.getAll()
      .then(data => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          setSchedules(data.map(s => ({
            id: s.id,
            name: s.name,
            type: s.type,
            weeklyHours: `${s.weeklyHours || 40} hours/week`,
            assignedCount: s._count?.employees ?? s.employees?.length ?? 0,
            status: 'Active',
          })));
        }
      })
      .catch(err => console.error('Failed to load schedules:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const scheduleData = useMemo(() => {
    return schedules.filter(s => 
      !search || 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.type.toLowerCase().includes(search.toLowerCase())
    );
  }, [schedules, search]);

  const columns = [
    { key: 'name', header: 'Name', width: '220px', render: (row) => (
      <div>
        <p className="font-semibold text-gray-900">{row.name}</p>
        <p className="text-xs text-gray-500">{row.type} Schedule</p>
      </div>
    )},
    { key: 'type', header: 'Type', width: '140px', render: (row) => (
      <Badge variant="gray">{row.type}</Badge>
    )},
    { key: 'weeklyHours', header: 'Weekly Hours', width: '160px', render: (row) => (
      <span className="font-medium text-gray-900">{row.weeklyHours}</span>
    )},
    { key: 'assignedCount', header: 'Employees Assigned', width: '160px', render: (row) => (
      <Badge variant="primary">{row.assignedCount} Employees</Badge>
    )},
    { key: 'status', header: 'Status', width: '120px', render: (row) => (
      <Badge variant={row.status === 'Active' ? 'success' : 'gray'}>{row.status}</Badge>
    )},
    { key: 'actions', header: 'Actions', width: '120px', render: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/schedules/${row.id}`)}>Edit</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6" data-testid="schedules-list-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Working Schedules' },
      ]} />

      <PageHeader
        title="Working Schedules"
        subtitle="Manage regular working hours, shift rotations, and weekly work plans"
        actions={
          <Button variant="primary" onClick={() => navigate('/schedules/new')}>
            + New Schedule
          </Button>
        }
      />

      <div className="filter-bar">
        <Input 
          placeholder="Search schedules by name or type..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="w-80" 
        />
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>Clear</Button>
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          <Table
            columns={columns}
            data={scheduleData}
            keyField="id"
            onRowClick={(row) => navigate(`/schedules/${row.id}`)}
            emptyMessage={loading ? "Loading working schedules..." : "No working schedules found"}
          />
        </CardBody>
      </Card>
    </div>
  );
}
