export type NamedChartValue = {
  name: string;
  value: number;
};

export type RoundRejectionChartValue = {
  round: string;
  count: number;
};

export type StudentRejectionChartValue = {
  student: string;
  count: number;
};

export type CompanyRatioChartValue = {
  company: string;
  ratio: number;
  selected: number;
  total: number;
};

export type CompanyOutcomeChartValue = {
  company: string;
  selected: number;
  rejected: number;
  active: number;
  dropped: number;
};

export type ScoreAverageChartValue = {
  metric: string;
  average: number;
};

export type RsaChartData = {
  companyStatus: NamedChartValue[];
  applicationOutcomes: NamedChartValue[];
  roundRejections: RoundRejectionChartValue[];
  studentRejections: StudentRejectionChartValue[];
  companySelectionRatios: CompanyRatioChartValue[];
  companyOutcomes: CompanyOutcomeChartValue[];
  scoreAverages: ScoreAverageChartValue[];
  studentPlacementStatus: NamedChartValue[];
};
