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

import {
  applications,
  companies,
  companySelectionRatios,
  roundRejectionCounts,
  studentRejectionCounts,
  students,
} from "@/lib/mock-data";

const palette = ["#4f46e5", "#10b981", "#f43f5e", "#f59e0b", "#06b6d4"];

export function RsaCharts({ companyId }: { companyId?: string }) {
  const companyStatus = [
    { name: "Upcoming", value: companies.filter((item) => item.currentStatus === "Upcoming").length },
    { name: "Hiring Done", value: companies.filter((item) => item.currentStatus === "Hiring Done" || item.currentStatus === "Selected").length },
    { name: "Rejected All", value: companies.filter((item) => item.currentStatus === "Rejected All").length },
    { name: "In Progress", value: companies.filter((item) => item.currentStatus === "In Progress").length },
  ];

  const benchmarkData = [
    { name: "Benchmark Cleared", value: students.filter((item) => item.benchmarkStatus === "Cleared").length },
    { name: "Not Cleared", value: students.filter((item) => item.benchmarkStatus === "Not Cleared").length },
    { name: "Not Taken", value: students.filter((item) => item.benchmarkStatus === "Not Taken").length },
  ];

  const assessmentData = [
    { name: "Assessment Cleared", value: students.filter((item) => item.assessmentStatus === "Cleared").length },
    { name: "Not Cleared", value: students.filter((item) => item.assessmentStatus === "Not Cleared").length },
    { name: "Not Taken", value: students.filter((item) => item.assessmentStatus === "Not Taken").length },
  ];

  const companyApplications = companyId
    ? applications.filter((item) => item.companyId === companyId)
    : applications;

  const journeyData = [
    {
      name: "In Progress",
      value: companyApplications.filter(
        (item) => !["SELECTED", "REJECTED", "DROPPED"].includes(item.currentStage),
      ).length,
    },
    {
      name: "Selected",
      value: companyApplications.filter((item) => item.currentStage === "SELECTED").length,
    },
    {
      name: "Rejected",
      value: companyApplications.filter((item) => item.currentStage === "REJECTED").length,
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartPanel title="Company Status">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={companyStatus} dataKey="value" nameKey="name" outerRadius={88} label>
              {companyStatus.map((entry, index) => (
                <Cell key={entry.name} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Round-Wise Rejections">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={roundRejectionCounts(companyId)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="round" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#f43f5e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Student-Wise Rejection Count">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={studentRejectionCounts()}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="student" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Company Selection Ratio">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={companySelectionRatios()}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="company" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} unit="%" />
            <Tooltip />
            <Bar dataKey="ratio" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Benchmarking">
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie data={benchmarkData} dataKey="value" nameKey="name" outerRadius={80} label>
              {benchmarkData.map((entry, index) => (
                <Cell key={entry.name} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Assessment Performance">
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie data={assessmentData} dataKey="value" nameKey="name" outerRadius={80} label>
              {assessmentData.map((entry, index) => (
                <Cell key={entry.name} fill={palette[(index + 1) % palette.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      {companyId ? (
        <ChartPanel title="Selected vs Rejected">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={journeyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      ) : null}
    </div>
  );
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
