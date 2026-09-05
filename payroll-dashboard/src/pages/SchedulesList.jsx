// src/pages/SchedulesList.jsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, CardBody, PageHeader, Button, Badge, Input, Table, Breadcrumb 
} from '../components/UI';
import { schedules, employees } from '../data/mockData';

export function SchedulesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const scheduleData = useMemo(() => {
    return schedules.map(sched => {
      const assignedCount = employees.filter(e => e.scheduleId === sched.id).length;
      return {
        ...sched,
        assignedCount,
      };
    }).filter(s => 
      !search || 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.type.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const columns = [
    { key: 'name', header: 'Name', width: '220px', render: (row) => (
      <div>
        <p className="font-semibold text-gray-900">{row.name}</p>
        <p className="text-xs text-gray-500">{row.timezone || 'UTC'}</p>
      </div>
    )},
    { key: 'type', header: 'Type', width: '140px', render: (row) => (
      <Badge variant="gray">{row.type}</Badge>
    )},
    { key: 'weeklyHours', header: 'Weekly Hours', width: '160px', render: (row) => (
      // ponytail: display weeklyHours directly from data field as specified in Task 6 contract
      <span className="font-medium text-gray-900">{row.weeklyHours || '40 hours/week'}</span>
    )},
    { key: 'assignedCount', header: 'Employees Assigned', width: '160px', render: (row) => (
      <Badge variant="primary">{row.assignedCount} Employees</Badge>
    )},
    { key: 'status', header: 'Status', width: '120px', render: (row) => (
      <Badge variant={row.status === 'Active' ? 'success' : 'gray'}>{row.status || 'Active'}</Badge>
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
            emptyMessage="No working schedules found"
          />
        </CardBody>
      </Card>
    </div>
  );
}
