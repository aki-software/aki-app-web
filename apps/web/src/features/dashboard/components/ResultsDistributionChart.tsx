import { CategoryDistributionData } from '@akit/contracts';
import {
  ResponsiveContainer,
  Treemap,
  Tooltip,
} from 'recharts';

interface ResultsDistributionChartProps {
  data: CategoryDistributionData[];
}

const COLORS = [
  '#1a8a87', // Primary
  '#c4851e', // Secondary
  '#6aad6e', // Tertiary
  '#a78bfa',
  '#e879f9',
  '#2dd4bf',
];

interface CustomizedContentProps {
  root?: { children?: unknown[] };
  depth?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  colors: string[];
  name?: string;
}

const CustomizedContent = (props: CustomizedContentProps) => {
  const { root, depth = 0, x = 0, y = 0, width = 0, height = 0, index = 0, colors, name } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill:
            depth < 2 && root?.children?.length
              ? colors[Math.floor((index / root.children.length) * 6) % colors.length]
              : '#ffffff00',
          stroke: 'var(--color-app-bg)',
          strokeWidth: 2,
          strokeOpacity: 0.8,
        }}
      />
      {width > 50 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight={700}
        >
          {name}
        </text>
      )}
    </g>
  );
};

export function ResultsDistributionChart({ data }: ResultsDistributionChartProps) {
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="h-full w-full min-w-0 overflow-hidden rounded-xl">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          width={400}
          height={200}
          data={sortedData as unknown as Array<Record<string, unknown>>}
          dataKey="count"
          aspectRatio={4 / 3}
          stroke="#fff"
          fill="var(--color-app-primary)"
          content={<CustomizedContent colors={COLORS} />}
        >
          <Tooltip
            cursor={false}
            wrapperStyle={{ zIndex: 100, opacity: 1, outline: 'none' }}
            contentStyle={{
              backgroundColor: 'var(--color-app-bg)',
              borderRadius: '16px',
              border: '1px solid var(--color-app-border)',
              color: 'var(--color-app-text-main)',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
              fontSize: '12px',
              fontWeight: '900',
              padding: '12px 16px',
            }}
            itemStyle={{ color: 'var(--color-app-primary)', fontWeight: 900 }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

