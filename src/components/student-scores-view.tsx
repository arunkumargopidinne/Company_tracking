"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  Download,
  Filter,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface StudentScore {
  userId: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  benchmarking: number;
  weeklyAssessment: number;
  mentorScore: number;
  selectedStatus: string;
  batchDetails: string;
  yog: string;
  activeStatus: string;
  preferredJobTrack: string;
  enrolledOn: string;
  productCode: string;
  gender: string;
  state: string;
  formFills: string;
  placedThrough: string;
  placementType: string;
  placementDate: string;
  placedOrganisation: string;
  studentId: string;
}

interface FilterState {
  benchmarkingMin: number;
  assessmentMin: number;
  mentorMin: number;
  batch: string;
  yog: string;
  status: string;
  search: string;
}

export function StudentScoresView() {
  const [filteredStudents, setFilteredStudents] = useState<StudentScore[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    benchmarkingMin: 0,
    assessmentMin: 0,
    mentorMin: 0,
    batch: "",
    yog: "",
    status: "",
    search: "",
  });
  const [batches, setBatches] = useState<string[]>([]);
  const [yogs, setYogs] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStudents(nextFilters = filters) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (nextFilters.benchmarkingMin > 0) {
        params.append("benchmarkingMin", String(nextFilters.benchmarkingMin));
      }
      if (nextFilters.assessmentMin > 0) {
        params.append("assessmentMin", String(nextFilters.assessmentMin));
      }
      if (nextFilters.mentorMin > 0) {
        params.append("mentorMin", String(nextFilters.mentorMin));
      }
      if (nextFilters.batch) params.append("batch", nextFilters.batch);
      if (nextFilters.yog) params.append("yog", nextFilters.yog);
      if (nextFilters.status) params.append("status", nextFilters.status);
      if (nextFilters.search) params.append("search", nextFilters.search);

      const response = await fetch(`/api/students/scores?${params}`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error || "Unable to load student score sheet.");
        setFilteredStudents([]);
        return;
      }

      setFilteredStudents(data.students ?? []);

      const uniqueBatches = new Set<string>();
      const uniqueYogs = new Set<string>();
      const uniqueStatuses = new Set<string>();
      (data.students ?? []).forEach((student: StudentScore) => {
        if (student.batchDetails) uniqueBatches.add(student.batchDetails);
        if (student.yog) uniqueYogs.add(student.yog);
        if (student.selectedStatus) uniqueStatuses.add(student.selectedStatus);
      });
      setBatches(Array.from(uniqueBatches).sort());
      setYogs(Array.from(uniqueYogs).sort((a, b) => Number(a) - Number(b)));
      setStatuses(Array.from(uniqueStatuses).sort());
    } catch (fetchError) {
      console.error("Failed to fetch student scores:", fetchError);
      setError("Unable to load student score sheet. Check Sheets access and range.");
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof FilterState, value: string | number) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function applyFilters() {
    fetchStudents(filters);
    setShowFilters(false);
  }

  function resetFilters() {
    const nextFilters = {
      benchmarkingMin: 0,
      assessmentMin: 0,
      mentorMin: 0,
      batch: "",
      yog: "",
      status: "",
      search: "",
    };
    setFilters(nextFilters);
    fetchStudents(nextFilters);
  }

  async function exportAsCSV() {
    const params = new URLSearchParams();
    if (filters.benchmarkingMin > 0) {
      params.append("benchmarkingMin", String(filters.benchmarkingMin));
    }
    if (filters.assessmentMin > 0) {
      params.append("assessmentMin", String(filters.assessmentMin));
    }
    if (filters.mentorMin > 0) {
      params.append("mentorMin", String(filters.mentorMin));
    }
    if (filters.batch) params.append("batch", filters.batch);
    if (filters.yog) params.append("yog", filters.yog);
    if (filters.status) params.append("status", filters.status);
    if (filters.search) params.append("search", filters.search);
    params.append("export", "csv");

    window.location.href = `/api/students/scores?${params}`;
  }

  async function exportAsSheets() {
    const rows = filteredStudents.map((student) => [
      student.userId,
      student.studentId,
      student.fullName,
      student.mobileNumber,
      student.email,
      student.benchmarking,
      student.weeklyAssessment,
      student.mentorScore,
      student.selectedStatus,
      student.batchDetails,
      student.yog,
      student.activeStatus,
      student.preferredJobTrack,
    ]);
    const header = [
      "User ID",
      "Student ID",
      "Full Name",
      "Mobile Number",
      "Email",
      "Benchmarking",
      "Weekly Assessment",
      "Mentor Score",
      "Selected Status",
      "Batch Details",
      "YOG",
      "Active Status",
      "Preferred Job Track",
    ];
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `student-scores-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }

  const avgBenchmarking = filteredStudents.length
    ? (
        filteredStudents.reduce((sum, student) => sum + student.benchmarking, 0) /
        filteredStudents.length
      ).toFixed(1)
    : "0";
  const avgAssessment = filteredStudents.length
    ? (
        filteredStudents.reduce((sum, student) => sum + student.weeklyAssessment, 0) /
        filteredStudents.length
      ).toFixed(1)
    : "0";
  const avgMentor = filteredStudents.length
    ? (
        filteredStudents.reduce((sum, student) => sum + student.mentorScore, 0) /
        filteredStudents.length
      ).toFixed(1)
    : "0";
  const selectedCount = filteredStudents.filter(
    (student) => student.selectedStatus.toLowerCase() === "selected",
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Metric label="Total Students" value={filteredStudents.length} />
        <Metric label="Selected" value={selectedCount} tone="text-green-600" />
        <Metric label="Avg Benchmarking" value={avgBenchmarking} tone="text-blue-600" />
        <Metric label="Avg Assessment" value={avgAssessment} tone="text-purple-600" />
        <Metric label="Avg Mentor" value={avgMentor} tone="text-orange-600" />
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, user ID, student ID, or YOG..."
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && applyFilters()}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {showFilters ? (
          <div className="grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-3 lg:grid-cols-7">
            <NumberFilter
              label="Benchmarking Min"
              value={filters.benchmarkingMin}
              onChange={(value) => handleFilterChange("benchmarkingMin", value)}
            />
            <NumberFilter
              label="Assessment Min"
              value={filters.assessmentMin}
              onChange={(value) => handleFilterChange("assessmentMin", value)}
            />
            <NumberFilter
              label="Mentor Min"
              value={filters.mentorMin}
              onChange={(value) => handleFilterChange("mentorMin", value)}
            />
            <SelectFilter
              label="Batch"
              value={filters.batch}
              emptyLabel="All Batches"
              options={batches}
              onChange={(value) => handleFilterChange("batch", value)}
            />
            <SelectFilter
              label="YOG"
              value={filters.yog}
              emptyLabel="All Years"
              options={yogs}
              onChange={(value) => handleFilterChange("yog", value)}
            />
            <SelectFilter
              label="Status"
              value={filters.status}
              emptyLabel="All Status"
              options={statuses}
              onChange={(value) => handleFilterChange("status", value)}
            />
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 rounded bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                Reset
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={exportAsCSV}
            className="inline-flex items-center gap-2 rounded bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportAsSheets}
            className="inline-flex items-center gap-2 rounded bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200"
          >
            <Download className="h-4 w-4" />
            Download Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading student scores...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">{error}</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No students found matching your filters.
          </div>
        ) : (
          <table className="w-full min-w-[1130px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Student ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Phone</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Benchmarking</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Assessment</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Mentor</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Total Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">YOG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((student) => {
                const totalScore =
                  (student.benchmarking + student.weeklyAssessment + student.mentorScore) / 3;
                const trend = totalScore >= 65 ? "up" : totalScore >= 50 ? "neutral" : "down";

                return (
                  <tr key={`${student.userId}-${student.email}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {student.fullName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {student.studentId || student.userId}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{student.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{student.mobileNumber}</td>
                    <ScoreCell value={student.benchmarking} color="text-blue-600" />
                    <ScoreCell value={student.weeklyAssessment} color="text-purple-600" />
                    <ScoreCell value={student.mentorScore} color="text-orange-600" />
                    <td className="px-4 py-3 text-center">
                      <div
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          trend === "up"
                            ? "bg-green-100 text-green-700"
                            : trend === "neutral"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {totalScore.toFixed(1)}
                        {trend === "up" && <TrendingUp className="h-3 w-3" />}
                        {trend === "down" && <TrendingDown className="h-3 w-3" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          student.selectedStatus.toLowerCase() === "selected"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {student.selectedStatus || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{student.batchDetails}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                      {student.yog || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "text-slate-950",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function NumberFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(parseInt(event.target.value, 10) || 0)}
        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
      />
    </div>
  );
}

function SelectFilter({
  label,
  value,
  emptyLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  emptyLabel: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function ScoreCell({ value, color }: { value: number; color: string }) {
  return (
    <td className="px-4 py-3 text-center">
      <div className={`text-sm font-semibold ${color}`}>{value.toFixed(1)}</div>
    </td>
  );
}
