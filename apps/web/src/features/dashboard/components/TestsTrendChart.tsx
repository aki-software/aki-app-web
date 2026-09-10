import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TestsTrendChartProps {
  data: Array<{ date: string; started: number; completed: number; }>;
}

export function TestsTrendChart({ data }: TestsTrendChartProps) {
  const formattedData = data.map(item => {
    const [, month, day] = item.date.split('-');
    return { ...item, label: day + '/' + month };
  });

  return (
    <div className='h-full w-full min-w-0 overflow-hidden pt-4'>
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id='colorStarted' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor='var(--color-app-text-muted)' stopOpacity={0.2}/>
              <stop offset='95%' stopColor='var(--color-app-text-muted)' stopOpacity={0}/>
            </linearGradient>
            <linearGradient id='colorCompleted' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor='var(--color-app-primary)' stopOpacity={0.4}/>
              <stop offset='95%' stopColor='var(--color-app-primary)' stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='var(--color-app-border)' opacity={0.5} />
          <XAxis dataKey='label' axisLine={false} tickLine={false} tick={{ fill: 'var(--color-app-text-muted)', fontSize: 11, fontWeight: 600 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-app-text-muted)', fontSize: 11, fontWeight: 600 }} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--color-app-surface)', borderRadius: '12px', border: '1px solid var(--color-app-border)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 700, fontSize: '12px' }} />
          <Area type='monotone' dataKey='started' name='Iniciados' stroke='var(--color-app-text-muted)' strokeWidth={2} fillOpacity={1} fill='url(#colorStarted)' />
          <Area type='monotone' dataKey='completed' name='Completados' stroke='var(--color-app-primary)' strokeWidth={3} fillOpacity={1} fill='url(#colorCompleted)' />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

