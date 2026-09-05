function computeWeeklyHours(
  lines: { startTime: string; endTime: string; breakMins: number }[]
): number {
  const totalMins = lines.reduce((sum, line) => {
    const [sh, sm] = line.startTime.split(':').map(Number);
    const [eh, em] = line.endTime.split(':').map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm) - line.breakMins;
    return sum + mins;
  }, 0);
  return Math.round((totalMins / 60) * 10) / 10;
}

describe('schedule-hours calculation', () => {
  test('Mon-Fri 09:00-17:00 with 60min break each -> weeklyHours = 35.0', () => {
    const lines = Array(5).fill({
      startTime: '09:00',
      endTime: '17:00',
      breakMins: 60,
    });
    expect(computeWeeklyHours(lines)).toBe(35.0);
  });

  test('Mon-Sat 08:00-16:00 with 30min break each -> weeklyHours = 45.0', () => {
    const lines = Array(6).fill({
      startTime: '08:00',
      endTime: '16:00',
      breakMins: 30,
    });
    expect(computeWeeklyHours(lines)).toBe(45.0);
  });
});
