/**
 * Custom Chart Components
 * Beautiful charts with custom tooltips, gradients, and modern styling
 */

import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { TimeSeriesData, CategoryStats } from '../../../../services/adminStatsService';

// Custom Tooltip Component
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  unit?: string;
  formatValue?: (value: number) => string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, unit = '', formatValue }) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-100 p-4 min-w-[160px]">
      <p className="text-sm font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-100">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry: { name: string; value: number; color: string }, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-gray-600">{entry.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatValue ? formatValue(entry.value as number) : (entry.value as number).toLocaleString()}{unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Custom Legend Component
const CustomLegend: React.FC<{ payload?: Array<{ value: string; color: string }> }> = ({ payload }) => {
  if (!payload) return null;
  
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Chart Card Wrapper
interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({ 
  title, 
  subtitle,
  children, 
  action,
  className = ''
}) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 ${className}`}>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

// Area Chart with Gradient
interface GrowthAreaChartProps {
  data: TimeSeriesData[];
  dataKey?: string;
  color?: string;
  name: string;
  height?: number;
}

export const GrowthAreaChart: React.FC<GrowthAreaChartProps> = ({
  data,
  dataKey = 'value',
  color = '#3B82F6',
  name,
  height = 300
}) => {
  const gradientId = `gradient-${color.replace('#', '')}`;
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="label" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          name={name}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Bar Chart with Rounded Corners
interface ActivityBarChartProps {
  data: TimeSeriesData[];
  primaryKey?: string;
  secondaryKey?: string;
  primaryColor?: string;
  secondaryColor?: string;
  primaryName: string;
  secondaryName?: string;
  height?: number;
}

export const ActivityBarChart: React.FC<ActivityBarChartProps> = ({
  data,
  primaryKey = 'value',
  secondaryKey = 'value2',
  primaryColor = '#10B981',
  secondaryColor = '#3B82F6',
  primaryName,
  secondaryName,
  height = 300
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="primaryBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryColor} stopOpacity={1} />
            <stop offset="100%" stopColor={primaryColor} stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="secondaryBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={secondaryColor} stopOpacity={1} />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="label" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        <Bar 
          dataKey={primaryKey} 
          fill="url(#primaryBarGradient)"
          radius={[4, 4, 0, 0]}
          name={primaryName}
        />
        {secondaryKey && secondaryName && (
          <Bar 
            dataKey={secondaryKey} 
            fill="url(#secondaryBarGradient)"
            radius={[4, 4, 0, 0]}
            name={secondaryName}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};

// Donut Pie Chart
interface DonutChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  colors?: string[];
  height?: number;
  showLabels?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  colors = DEFAULT_COLORS,
  height = 280,
  showLabels = true,
  innerRadius = 50,
  outerRadius = 90
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius: or, percent, name } = props;
    if (!percent || percent < 0.05) return null; // Don't show labels for very small slices
    
    const RADIAN = Math.PI / 180;
    const radius = or * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {name}: {(percent * 100).toFixed(0)}%
      </text>
    );
  };
  
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            label={showLabels ? renderCustomizedLabel : undefined}
            labelLine={showLabels}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || colors[index % colors.length]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip 
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const item = payload[0].payload;
              const percent = ((item.value / total) * 100).toFixed(1);
              return (
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-100 p-3">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    {item.value.toLocaleString()} ({percent}%)
                  </p>
                </div>
              );
            }}
          />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center Total */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
      </div>
    </div>
  );
};

// Line Chart with Multiple Lines
interface TrendLineChartProps {
  data: TimeSeriesData[];
  lines: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  height?: number;
  yDomain?: [number, number];
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  lines,
  height = 300,
  yDomain
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <XAxis 
          dataKey="label" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          dy={10}
        />
        <YAxis 
          domain={yDomain}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            strokeWidth={2.5}
            dot={{ fill: line.color, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
            name={line.name}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

// Horizontal Bar Chart (for rating distribution)
interface HorizontalBarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  height = 250
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart 
        data={data} 
        layout="vertical"
        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
      >
        <XAxis 
          type="number" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
        />
        <YAxis 
          type="category" 
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="value" 
          radius={[0, 6, 6, 0]}
          maxBarSize={24}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || `hsl(${(index / data.length) * 200 + 100}, 70%, 50%)`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// Category Performance Chart
interface CategoryChartProps {
  categories: CategoryStats[];
  height?: number;
  quizLabel: string;
  completionLabel: string;
}

export const CategoryPerformanceChart: React.FC<CategoryChartProps> = ({
  categories,
  height = 300,
  quizLabel,
  completionLabel
}) => {
  const data = categories.slice(0, 5);
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="quizGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#6B7280' }}
          dy={10}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        <Bar 
          dataKey="quizCount" 
          fill="url(#quizGradient)"
          radius={[4, 4, 0, 0]}
          name={quizLabel}
        />
        <Bar 
          dataKey="completionCount" 
          fill="url(#completionGradient)"
          radius={[4, 4, 0, 0]}
          name={completionLabel}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Progress Bar Component
interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  value,
  max = 100,
  color = '#3B82F6',
  showPercentage = true,
  size = 'md'
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold" style={{ color }}>
          {showPercentage ? `${percentage.toFixed(1)}%` : value.toLocaleString()}
        </span>
      </div>
      <div className={`w-full bg-gray-100 rounded-full ${heightClass} overflow-hidden`}>
        <div 
          className={`${heightClass} rounded-full transition-all duration-500 ease-out`}
          style={{ 
            width: `${percentage}%`, 
            backgroundColor: color,
            backgroundImage: `linear-gradient(90deg, ${color}, ${color}dd)`
          }}
        />
      </div>
    </div>
  );
};

export default {
  ChartCard,
  GrowthAreaChart,
  ActivityBarChart,
  DonutChart,
  TrendLineChart,
  HorizontalBarChart,
  CategoryPerformanceChart,
  ProgressBar
};
