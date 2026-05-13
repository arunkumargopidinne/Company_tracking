"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RsaChartData } from "@/lib/report-chart-types";

const palette = ["#4f46e5", "#10b981", "#f43f5e", "#f59e0b", "#06b6d4", "#8b5cf6"];

export function RsaCharts({ data }: { data: RsaChartData }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartPanel title="Company Pipeline Status">
        <PieBlock data={data.companyStatus} />
      </ChartPanel>

      <ChartPanel title="Application Outcomes">
        <PieBlock data={data.applicationOutcomes} />
      </ChartPanel>

      <ChartPanel title="Round-Wise Rejections">
        <EmptyAware hasData={hasCountData(data.roundRejections)}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.roundRejections}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="round" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </EmptyAware>
      </ChartPanel>

      <ChartPanel title="Top Student Rejection Counts">
        <EmptyAware hasData={hasCountData(data.studentRejections)}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.studentRejections}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="student" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </EmptyAware>
      </ChartPanel>

      <ChartPanel title="Company Selection Ratio">
        <EmptyAware hasData={data.companySelectionRatios.some((item) => item.total > 0)}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.companySelectionRatios}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="company" tick={{ fontSize: 11 }} interval={0} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip
                formatter={(value, name, item) => [
                  `${value}% (${item.payload.selected}/${item.payload.total})`,
                  name,
                ]}
              />
              <Bar dataKey="ratio" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </EmptyAware>
      </ChartPanel>

      <ChartPanel title="Company Application Split">
        <EmptyAware hasData={data.companyOutcomes.length > 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.companyOutcomes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="company" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="active" stackId="a" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              <Bar dataKey="selected" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="rejected" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="dropped" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </EmptyAware>
      </ChartPanel>

      <ChartPanel title="Student Score Averages">
        <EmptyAware hasData={data.scoreAverages.some((item) => item.average > 0)}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.scoreAverages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals />
              <Tooltip />
              <Bar dataKey="average" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </EmptyAware>
      </ChartPanel>

      <ChartPanel title="Student Placement Status">
        <PieBlock data={data.studentPlacementStatus} />
      </ChartPanel>
    </div>
  );
}

function PieBlock({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <EmptyAware hasData={hasValueData(data)}>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={88} label>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={palette[index % palette.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </EmptyAware>
  );
}

function EmptyAware({
  hasData,
  children,
}: {
  hasData: boolean;
  children: React.ReactNode;
}) {
  if (!hasData) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-[8px] border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
        No sheet data available for this chart yet.
      </div>
    );
  }

  return children;
}

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-black text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function hasValueData(data: Array<{ value: number }>) {
  return data.some((item) => item.value > 0);
}

function hasCountData(data: Array<{ count: number }>) {
  return data.some((item) => item.count > 0);
}
