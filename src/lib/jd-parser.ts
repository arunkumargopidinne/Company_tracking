export type EligibilityDetails = {
  passoutYear: string;
  education: string;
  departments: string;
};

export type InterviewDetails = {
  mode: string;
  rounds: string[];
};

export type WorkDetails = {
  workingDays: string;
  location: string;
  saturdayPolicy: string;
  joining: string;
  relocation: string;
};

export type ParsedJobDescription = {
  loadedDate: string;
  companyName: string;
  role: string;
  location: string;
  jobType: string;
  internshipDuration: string;
  stipend: string;
  ctc: string;
  openings: string;
  eligibility: string;
  eligibilityDetails: EligibilityDetails;
  passoutYear: string;
  education: string;
  departments: string;
  skillsRequired: string[];
  interviewMode: string;
  interviewProcess: string;
  interviewDetails: InterviewDetails;
  rounds: string[];
  workDetails: string;
  workDetailsStructured: WorkDetails;
  driveDates: string;
  bond: string;
  remarks: string;
  remarksList: string[];
  rolloutBatches: string[];
  raw: string;
};

export type JobDescriptionFields = Partial<
  Pick<
    ParsedJobDescription,
    | "companyName"
    | "role"
    | "location"
    | "jobType"
    | "internshipDuration"
    | "stipend"
    | "ctc"
    | "openings"
    | "eligibility"
    | "passoutYear"
    | "education"
    | "departments"
    | "interviewMode"
    | "interviewProcess"
    | "workDetails"
    | "bond"
    | "remarks"
  >
> & {
  skillsRequired?: string[] | string;
};

export type StructuredJobDescriptionFields = Omit<
  JobDescriptionFields,
  "eligibility" | "interviewProcess" | "workDetails" | "remarks"
> & {
  eligibility?: string | Partial<EligibilityDetails>;
  interviewProcess?: string | Partial<InterviewDetails>;
  workDetails?: string | Partial<WorkDetails>;
  remarks?: string[] | string;
};

type SectionKey =
  | "companyName"
  | "role"
  | "location"
  | "jobType"
  | "internshipDuration"
  | "stipend"
  | "ctc"
  | "openings"
  | "eligibility"
  | "passoutYear"
  | "education"
  | "departments"
  | "skillsRequired"
  | "interviewProcess"
  | "workDetails"
  | "bond"
  | "remarks";

const sectionAliases: Record<SectionKey, string[]> = {
  companyName: ["Company", "Company Name", "Organization", "Organisation"],
  role: ["Role", "Job Role", "Designation", "Position", "Job Title", "Profile"],
  location: ["Location", "Job Location", "Work Location", "Work location"],
  jobType: ["Job Type", "Employment Type", "Opportunity Type"],
  internshipDuration: ["Internship Duration", "Duration"],
  stipend: ["Stipend", "Internship Stipend"],
  ctc: ["CTC", "CTC Post Internship", "CTC (Post Internship)", "Package"],
  openings: [
    "Openings",
    "No of Openings",
    "No. of Openings",
    "Number of Openings",
    "Positions",
    "Vacancies",
  ],
  eligibility: ["Eligibility", "Eligible Criteria", "Education Criteria", "Criteria"],
  passoutYear: ["Passout Year", "Pass out year", "Passing Year", "Year of Passing"],
  education: ["Education", "Qualification", "Degree"],
  departments: ["Departments", "Department", "Branches", "Branch"],
  skillsRequired: [
    "Skills Required",
    "Skills",
    "Primary skills",
    "Primary Skills",
    "Required Skills",
    "Tech Stack",
  ],
  interviewProcess: ["Interview Process", "Hiring Process", "Selection Process"],
  workDetails: ["Work Details", "Work Mode", "Working Details"],
  bond: ["Bond / Service Agreement", "Bond", "Service Agreement", "Any Bond"],
  remarks: ["Remarks", "Remark", "Notes", "Additional Notes"],
};

const aliasToKey = new Map<string, SectionKey>(
  Object.entries(sectionAliases).flatMap(([key, labels]) =>
    labels.map((label) => [normalizeLabel(label), key as SectionKey]),
  ),
);

const blockSectionKeys = new Set<SectionKey>([
  "eligibility",
  "interviewProcess",
  "workDetails",
  "remarks",
]);

export function parseJobDescription(
  raw: string,
  now = new Date(),
): ParsedJobDescription {
  const withoutOuterBraces = raw
    .replace(/^\s*{\s*/, "")
    .replace(/\s*}\s*$/, "");
  const rolloutBatches = extractRolloutBatches(withoutOuterBraces);
  const sanitizedRaw = stripUserInstructions(withoutOuterBraces)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const sections = collectSections(sanitizedRaw);
  const rawInterviewProcess = sectionValue(sections, "interviewProcess");
  const directLocation = sectionValue(sections, "location");
  const workDetailsText = sectionValue(sections, "workDetails") || directLocation;
  const location =
    cleanLocation(directLocation) ||
    cleanLocation(extractInlineValue(workDetailsText, "Location")) ||
    cleanLocation(extractInlineValue(workDetailsText, "Work Location")) ||
    findLocationFallback(sanitizedRaw);
  const rawRemarks = cleanRemarks(sectionValue(sections, "remarks"));
  const remarksList = splitRemarks(rawRemarks);
  const remarks = remarksList.length ? remarksList.join("\n") : rawRemarks;
  const eligibilityBase = sectionValue(sections, "eligibility");
  const passoutYear =
    cleanSingleLine(sectionValue(sections, "passoutYear")) ||
    extractPassoutYear(sanitizedRaw);
  const education =
    cleanEducation(sectionValue(sections, "education")) ||
    cleanEducation(eligibilityBase);
  const departments =
    cleanDepartments(sectionValue(sections, "departments")) ||
    inferDepartments(eligibilityBase);
  const eligibility = buildEligibilityText({
    eligibility: eligibilityBase,
    passoutYear,
    education,
    departments,
  });
  const interviewMode =
    cleanSingleLine(extractInlineValue(rawInterviewProcess, "Mode")) ||
    extractInterviewModeFromRaw(sanitizedRaw);
  const rounds = splitRounds(
    extractInlineValue(rawInterviewProcess, "Rounds") || rawInterviewProcess,
  );
  const skillsRequired = uniqueList([
    ...splitList(sectionValue(sections, "skillsRequired")),
    ...extractSkillsFromRemarks(remarks),
  ]);
  const bond = cleanBond(sectionValue(sections, "bond"));
  const internshipDuration = cleanSingleLine(
    sectionValue(sections, "internshipDuration"),
  );
  const ctc = formatCtc(sectionValue(sections, "ctc"));
  const stipend = formatStipend(sectionValue(sections, "stipend"));
  const workDetailsStructured = buildWorkDetails({
    location,
    workDetailsText,
    remarks,
  });

  return {
    loadedDate: formatSheetDate(now),
    companyName:
      cleanCompanyName(sectionValue(sections, "companyName")) ||
      extractCompanyNameFallback(sanitizedRaw),
    role:
      cleanSingleLine(sectionValue(sections, "role")) ||
      extractRoleFallback(sanitizedRaw),
    location,
    jobType:
      cleanSingleLine(sectionValue(sections, "jobType")) ||
      inferJobType({ internshipDuration, stipend, ctc }),
    internshipDuration,
    stipend,
    ctc,
    openings: cleanSingleLine(sectionValue(sections, "openings")),
    eligibility,
    eligibilityDetails: {
      passoutYear,
      education,
      departments,
    },
    passoutYear,
    education,
    departments,
    skillsRequired,
    interviewMode,
    interviewProcess: cleanBlock(rawInterviewProcess),
    interviewDetails: {
      mode: interviewMode,
      rounds,
    },
    rounds,
    workDetails: cleanBlock(workDetailsText),
    workDetailsStructured,
    driveDates: cleanSingleLine(
      extractInlineValue(workDetailsText, "Offline Drive Dates") ||
        extractInlineValue(workDetailsText, "Drive Dates"),
    ),
    bond,
    remarks,
    remarksList,
    rolloutBatches,
    raw: sanitizedRaw,
  };
}

export function applyJobDescriptionFields(
  base: ParsedJobDescription,
  fields: StructuredJobDescriptionFields,
): ParsedJobDescription {
  const eligibility =
    typeof fields.eligibility === "object"
      ? {
          passoutYear: cleanSingleLine(fields.eligibility.passoutYear ?? ""),
          education: cleanEducation(fields.eligibility.education ?? ""),
          departments: cleanDepartments(fields.eligibility.departments ?? ""),
        }
      : undefined;
  const interview =
    typeof fields.interviewProcess === "object"
      ? {
          mode: cleanSingleLine(fields.interviewProcess.mode ?? ""),
          rounds: uniqueList(fields.interviewProcess.rounds ?? []),
        }
      : undefined;
  const work =
    typeof fields.workDetails === "object"
      ? {
          workingDays: cleanSingleLine(fields.workDetails.workingDays ?? ""),
          location: cleanLocation(fields.workDetails.location ?? ""),
          saturdayPolicy: cleanSingleLine(fields.workDetails.saturdayPolicy ?? ""),
          joining: cleanSingleLine(fields.workDetails.joining ?? ""),
          relocation: cleanSingleLine(fields.workDetails.relocation ?? ""),
        }
      : undefined;
  const remarksList = Array.isArray(fields.remarks)
    ? fields.remarks.map(cleanSingleLine).filter(Boolean)
    : splitRemarks(fields.remarks ?? "");
  const skillsRequired = uniqueList([
    ...normalizeSkills(fields.skillsRequired ?? []),
    ...extractSkillsFromRemarks(remarksList.join("\n")),
  ]);
  const passoutYear =
    cleanSingleLine(fields.passoutYear ?? "") ||
    eligibility?.passoutYear ||
    base.passoutYear;
  const education =
    cleanEducation(fields.education ?? "") ||
    eligibility?.education ||
    base.education;
  const departments =
    cleanDepartments(fields.departments ?? "") ||
    eligibility?.departments ||
    base.departments;
  const location =
    cleanLocation(fields.location ?? "") || work?.location || base.location;
  const interviewProcess =
    typeof fields.interviewProcess === "string"
      ? cleanBlock(fields.interviewProcess)
      : interview?.rounds.join(", ") || base.interviewProcess;
  const rounds = uniqueList(interview?.rounds?.length ? interview.rounds : base.rounds);
  const workDetailsStructured = {
    workingDays: work?.workingDays || base.workDetailsStructured.workingDays,
    location: location || base.workDetailsStructured.location,
    saturdayPolicy: work?.saturdayPolicy || base.workDetailsStructured.saturdayPolicy,
    joining: work?.joining || base.workDetailsStructured.joining,
    relocation: work?.relocation || base.workDetailsStructured.relocation,
  };
  const workDetails =
    typeof fields.workDetails === "string"
      ? cleanBlock(fields.workDetails)
      : buildWorkDetailsText(workDetailsStructured) || base.workDetails;
  const ctc = formatCtc(fields.ctc ?? "") || base.ctc;
  const stipend = formatStipend(fields.stipend ?? "") || base.stipend;
  const internshipDuration =
    cleanSingleLine(fields.internshipDuration ?? "") || base.internshipDuration;

  return {
    ...base,
    companyName: cleanCompanyName(fields.companyName ?? "") || base.companyName,
    role: cleanSingleLine(fields.role ?? "") || base.role,
    location,
    jobType:
      cleanSingleLine(fields.jobType ?? "") ||
      base.jobType ||
      inferJobType({ internshipDuration, stipend, ctc }),
    internshipDuration,
    stipend,
    ctc,
    openings: cleanSingleLine(fields.openings ?? "") || base.openings,
    eligibility: buildEligibilityText({
      eligibility:
        typeof fields.eligibility === "string" ? fields.eligibility : base.eligibility,
      passoutYear,
      education,
      departments,
    }),
    eligibilityDetails: {
      passoutYear,
      education,
      departments,
    },
    passoutYear,
    education,
    departments,
    skillsRequired: skillsRequired.length ? skillsRequired : base.skillsRequired,
    interviewMode:
      cleanSingleLine(fields.interviewMode ?? "") ||
      interview?.mode ||
      base.interviewMode,
    interviewProcess,
    interviewDetails: {
      mode:
        cleanSingleLine(fields.interviewMode ?? "") ||
        interview?.mode ||
        base.interviewMode,
      rounds,
    },
    rounds,
    workDetails,
    workDetailsStructured,
    bond: cleanBond(fields.bond ?? "") || base.bond,
    remarks: remarksList.length ? remarksList.join("\n") : base.remarks,
    remarksList: remarksList.length ? remarksList : base.remarksList,
  };
}

export function validateParsedJob(job: ParsedJobDescription) {
  const errors: string[] = [];

  if (!isValidCompanyName(job.companyName)) {
    errors.push(
      "Company name could not be extracted. Please check the JD text or enter company name manually.",
    );
  }

  if (!job.role || /^job description$/i.test(job.role)) {
    errors.push("Role could not be extracted. Please check the JD role/title.");
  }

  if (!job.location) {
    errors.push("Location could not be extracted. Please include the work location.");
  }

  if (job.skillsRequired.length === 0) {
    errors.push("Skills are required and could not be extracted.");
  }

  if (!job.openings) {
    errors.push("Openings are required and could not be extracted.");
  }

  if (!job.interviewProcess || job.rounds.length === 0) {
    errors.push("Interview process is required and could not be extracted.");
  }

  if (!job.eligibility && !job.passoutYear && !job.education) {
    errors.push("Eligibility is required and could not be extracted.");
  }

  if (!job.workDetails && !job.location) {
    errors.push("Work details are required and could not be extracted.");
  }

  if (!job.bond) {
    errors.push("Bond / service agreement details are required and could not be extracted.");
  }

  return errors;
}

export function parsedJobToCompanySheetRow(
  parsed: ParsedJobDescription,
  companyId: string,
) {
  return [
    parsed.loadedDate,
    parsed.companyName,
    parsed.skillsRequired.join(", "),
    parsed.raw,
    parsed.rounds.join(", "),
    "Dashboard",
    parsed.location,
    "",
    parsed.driveDates ? "Scheduled" : "yet to schedule",
    "In Progress",
    parsed.remarks,
    companyId,
    parsed.role,
    parsed.rolloutBatches.join(", "),
  ];
}

export function formatJobDescriptionFromFields(fields: JobDescriptionFields) {
  const skills = Array.isArray(fields.skillsRequired)
    ? fields.skillsRequired.join(", ")
    : fields.skillsRequired;
  const interviewProcess =
    fields.interviewProcess ||
    [fields.interviewMode ? `Mode - ${fields.interviewMode}` : ""]
      .filter(Boolean)
      .join("\n");
  const eligibility = buildEligibilityText({
    eligibility:
      typeof fields.eligibility === "string" ? fields.eligibility : "",
    passoutYear: fields.passoutYear,
    education: fields.education,
    departments: fields.departments,
  });

  return [
    line("Company", fields.companyName),
    line("Role", fields.role),
    line("Location", fields.location),
    line("Job Type", fields.jobType),
    line("Internship Duration", fields.internshipDuration),
    line("Stipend", fields.stipend),
    line("CTC (Post Internship)", fields.ctc),
    line("Openings", fields.openings),
    block("Eligibility", eligibility),
    block("Skills Required", skills),
    block("Interview Process", interviewProcess),
    block("Work Details", fields.workDetails),
    block("Bond / Service Agreement", fields.bond),
    block("Remarks", fields.remarks),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function splitSkillText(value: string) {
  return splitList(value);
}

export function isValidCompanyName(value: string) {
  const normalized = value.trim().toLowerCase();
  return Boolean(
    normalized &&
      normalized !== "undefined" &&
      normalized !== "untitled company" &&
      normalized !== "null",
  );
}

function collectSections(raw: string) {
  const sections: Partial<Record<SectionKey, string[]>> = {};
  let current: SectionKey | null = null;

  for (const line of raw.split("\n")) {
    const parsedLabel = parseLabelLine(line);

    if (parsedLabel) {
      const key = aliasToKey.get(normalizeLabel(parsedLabel.label));

      if (key) {
        current = key;
        if (!sections[key]) {
          sections[key] = [];
        }
        if (parsedLabel.value) {
          sections[key]?.push(parsedLabel.value);
        }
        continue;
      }

      if (current && blockSectionKeys.has(current)) {
        sections[current]?.push(line);
        continue;
      }

      current = null;
      continue;
    }

    if (current && line.trim()) {
      sections[current]?.push(line);
    }
  }

  return sections;
}

function parseLabelLine(line: string) {
  const match = line.match(/^\s*[-*"]?\s*([^:\n]+?)\s*[*_]*\s*:\s*[*_]*\s*(.*)$/);
  if (!match) return null;

  return {
    label: stripMarkdown(match[1]),
    value: stripMarkdown(match[2]),
  };
}

function sectionValue(
  sections: Partial<Record<SectionKey, string[]>>,
  key: SectionKey,
) {
  return cleanBlock((sections[key] ?? []).join("\n"));
}

function extractInlineValue(raw: string, label: string) {
  if (!raw) return "";

  const escaped = escapeRegExp(label);
  const match = raw.match(
    new RegExp(
      `^\\s*[*_]*${escaped}[*_\\s]*(?:-|\\u2013|\\u2014|:)\\s*[*_\\s]*(.+)$`,
      "im",
    ),
  );

  return cleanSingleLine(match?.[1] ?? "");
}

function normalizeSkills(value: string[] | string) {
  if (Array.isArray(value)) {
    return value.map(cleanSkill).filter(Boolean);
  }

  return splitList(value);
}

function splitList(value: string) {
  return value
    .split(/,|;|\n|\+|\s+and\s+/i)
    .map(cleanSkill)
    .filter(Boolean);
}

function splitRounds(value: string) {
  return value
    .replace(/\([^)]*\)/g, "")
    .split(/,|\+|\n/)
    .map((item) => stripMarkdown(item).replace(/\.$/, "").trim())
    .filter(Boolean);
}

function cleanSkill(value: string) {
  const clean = stripMarkdown(value)
    .replace(/^[-*]\s*/, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/^good communication skills?$/i.test(clean)) {
    return "Good Communication Skills";
  }

  return clean;
}

function cleanLocation(value: string) {
  const clean = cleanSingleLine(value)
    .replace(/^location\s*(?:-|:|\u2013|\u2014)\s*/i, "")
    .replace(/^work location\s*(?:-|:|\u2013|\u2014)\s*/i, "")
    .trim();

  if (!clean) return "";

  const parenthetical = clean.match(/\(([^)]+)\)/);
  if (/^(remote|hybrid|onsite)\b/i.test(clean) && parenthetical?.[1]) {
    return cleanSingleLine(parenthetical[1]);
  }

  if (/^(remote|hybrid|onsite)$/i.test(clean)) {
    return titleCase(clean);
  }

  return clean
    .replace(/\([^)]*\)/g, "")
    .replace(/^(remote|hybrid|onsite)\s*[-:]?\s*/i, "")
    .replace(/\bmode\b/gi, "")
    .trim();
}

function findLocationFallback(raw: string) {
  const labeled = raw.match(
    /^\s*(?:work\s+)?location\s*(?:-|:|\u2013|\u2014)\s*(.+)$/im,
  );
  const fromLabel = cleanLocation(labeled?.[1] ?? "");
  if (fromLabel) return fromLabel;

  const workMode = raw.match(/\b(remote|hybrid|onsite)\b(?:\s*\(([^)]+)\))?/i);
  if (workMode?.[2]) return cleanLocation(workMode[2]);
  if (workMode?.[1]) return titleCase(workMode[1]);

  return "";
}

function extractCompanyNameFallback(raw: string) {
  for (const line of raw.split("\n")) {
    const match =
      line.match(/\bfrom\s+the\s+company\s*(?:-|:|=)\s*([^\n.;]+)/i) ||
      line.match(/\bcompany(?:\s+name)?\s*(?:-|:|=|is)\s*([^\n.;]+)/i) ||
      line.match(/\b(?:organization|organisation)\s*(?:-|:|=|is)\s*([^\n.;]+)/i);

    if (match?.[1]) {
      const clean = cleanCompanyName(match[1]);
      if (isValidCompanyName(clean)) return clean;
    }
  }

  return "";
}

function extractRoleFallback(raw: string) {
  for (const line of raw.split("\n")) {
    const fromCompany = line.match(/^["']?\s*(.+?)\s+from\s+the\s+company\b/i);
    if (fromCompany?.[1]) {
      return cleanSingleLine(fromCompany[1]);
    }
  }

  return "";
}

function cleanCompanyName(value: string) {
  return cleanSingleLine(value)
    .replace(/^the\s+company\s*(?:-|:)?\s*/i, "")
    .replace(/\band\s+below\b.*$/i, "")
    .replace(/["'.]+$/g, "")
    .trim();
}

function extractPassoutYear(raw: string) {
  const match = raw.match(
    /^\s*pass\s*out\s*year\s*(?:-|:|\u2013|\u2014)\s*([^\n]+)/im,
  );

  return cleanSingleLine(match?.[1] ?? "");
}

function cleanEducation(value: string) {
  const clean = cleanSingleLine(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/\bany\s+degree\b/i, "Any Degree")
    .trim();

  if (/^any degree$/i.test(clean)) return "Any Degree";
  return clean;
}

function cleanDepartments(value: string) {
  const clean = cleanSingleLine(value)
    .replace(/\bany\s+(branch|department)\b/i, "Any Branch")
    .trim();

  if (/^any branch$/i.test(clean)) return "Any Branch";
  return clean;
}

function inferDepartments(eligibility: string) {
  if (/\bany\s+degree\b/i.test(eligibility) || /\bskill\s*based\b/i.test(eligibility)) {
    return "Any Branch";
  }

  return "";
}

function buildEligibilityText(input: {
  eligibility?: string;
  passoutYear?: string;
  education?: string;
  departments?: string;
}) {
  return [
    cleanBlock(input.eligibility ?? ""),
    input.education ? `Education: ${cleanEducation(input.education)}` : "",
    input.departments ? `Departments: ${cleanDepartments(input.departments)}` : "",
    input.passoutYear ? `Passout Year: ${cleanSingleLine(input.passoutYear)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function extractInterviewModeFromRaw(raw: string) {
  const match = raw.match(/interview\s+process\s*\(([^)]+)\)/i);
  return titleCase(cleanSingleLine(match?.[1] ?? ""));
}

function buildWorkDetails(input: {
  location: string;
  workDetailsText: string;
  remarks: string;
}): WorkDetails {
  const combined = `${input.workDetailsText}\n${input.remarks}`;
  const parenthetical = input.workDetailsText.match(/\(([^)]+)\)/)?.[1] ?? "";

  return {
    workingDays: /6\s*days?\s*(?:a|per)?\s*week/i.test(combined)
      ? "6 Working Days"
      : "",
    location: input.location,
    saturdayPolicy:
      cleanSingleLine(
        parenthetical.match(/alternative\s+saturdays?[^.;)]*/i)?.[0] ?? "",
      ) || "",
    joining: /\bimmediate\s+joiner/i.test(combined)
      ? "Immediate Joiners Only"
      : "",
    relocation: /\bopen\s+to\s+relocate\b/i.test(combined)
      ? "Candidate should be open to relocate"
      : "",
  };
}

function buildWorkDetailsText(work: WorkDetails) {
  return [
    work.location ? `Location: ${work.location}` : "",
    work.workingDays ? `Working Days: ${work.workingDays}` : "",
    work.saturdayPolicy ? `Saturday Policy: ${work.saturdayPolicy}` : "",
    work.joining ? `Joining: ${work.joining}` : "",
    work.relocation ? `Relocation: ${work.relocation}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function inferJobType(input: {
  internshipDuration: string;
  stipend: string;
  ctc: string;
}) {
  if ((input.internshipDuration || input.stipend) && input.ctc) {
    return "Internship + Full Time";
  }

  if (input.internshipDuration || input.stipend) {
    return "Internship";
  }

  if (input.ctc) {
    return "Full Time";
  }

  return "";
}

function formatStipend(value: string) {
  const clean = cleanSingleLine(value);
  if (!clean) return "";

  const range = clean.match(
    /(\d+(?:\.\d+)?)\s*(?:-|to|\u2013|\u2014)\s*(\d+(?:\.\d+)?)\s*k\b/i,
  );
  if (range) {
    return `\u20b9${formatThousands(Number(range[1]) * 1000)} \u2013 \u20b9${formatThousands(
      Number(range[2]) * 1000,
    )}/month`;
  }

  const single = clean.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (single) {
    return `\u20b9${formatThousands(Number(single[1]) * 1000)}/month`;
  }

  return clean.replace(/\s+per\s+month/i, "/month");
}

function formatCtc(value: string) {
  const clean = cleanSingleLine(value);
  if (!clean) return "";

  const range = clean.match(
    /(\d+(?:\.\d+)?)\s*(?:-|to|\u2013|\u2014)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i,
  );
  if (range) {
    return `\u20b9${range[1]} \u2013 ${range[2]} LPA`;
  }

  const single = clean.match(/(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i);
  if (single) {
    return `\u20b9${single[1]} LPA`;
  }

  return clean;
}

function formatThousands(value: number) {
  return Math.round(value).toLocaleString("en-IN");
}

function cleanBond(value: string) {
  const clean = cleanSingleLine(value);
  if (!clean) return "";
  if (/^(na|n\/a|nil|none|no|not applicable)$/i.test(clean)) return "NA";
  return clean;
}

function cleanRemarks(value: string) {
  const withoutInstructions = stripUserInstructions(value);
  const withoutGeneratedSummary = withoutInstructions
    .split("\n")
    .filter((line) => !looksLikeGeneratedSummary(line))
    .join("\n");

  return cleanBlock(withoutGeneratedSummary);
}

function splitRemarks(value: string) {
  const bullets = cleanBlock(value)
    .split(/\n|(?:^|\s)[*-]\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const expanded: string[] = [];

  for (const bullet of bullets) {
    const immediateJoiner = bullet.match(
      /^(.*?\bopen\s+to\s+relocate\b),?\s+and\s+should\s+be\s+an\s+immediate\s+joiner\.?$/i,
    );

    if (immediateJoiner?.[1]) {
      expanded.push(cleanSingleLine(immediateJoiner[1]));
      expanded.push("Candidate should be an immediate joiner");
      continue;
    }

    expanded.push(cleanSingleLine(bullet));
  }

  return uniqueList(expanded.map((item) => item.replace(/\.$/, "")));
}

function extractSkillsFromRemarks(remarks: string) {
  if (/\bgood\s+communication\s+skills?\b/i.test(remarks)) {
    return ["Good Communication Skills"];
  }

  return [];
}

function looksLikeGeneratedSummary(line: string) {
  const compact = line.toLowerCase();
  return (
    compact.includes("role:") &&
    compact.includes("job type:") &&
    compact.includes("ctc:")
  );
}

function stripUserInstructions(value: string) {
  return value
    .split("\n")
    .map((line) =>
      line.replace(
        /\b(?:can\s+you\s+|please\s+)?roll\s+out\s+(?:the\s+)?form\b.*$/i,
        "",
      ),
    )
    .filter((line) => !isInstructionLine(line))
    .join("\n")
    .trim();
}

function isInstructionLine(line: string) {
  return /\b(?:can\s+you\s+|please\s+)?roll\s+out\s+(?:the\s+)?form\b/i.test(
    line,
  );
}

function extractRolloutBatches(value: string) {
  const range = value.match(
    /batch\s*-?\s*(\d+)\s*(?:to|through|-)\s*batch\s*-?\s*(\d+)/i,
  );

  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    return Array.from(
      { length: high - low + 1 },
      (_, index) => `Batch ${low + index}`,
    );
  }

  return Array.from(
    new Set(
      [...value.matchAll(/batch\s*-?\s*(\d+)/gi)].map(
        (match) => `Batch ${Number(match[1])}`,
      ),
    ),
  );
}

function line(label: string, value?: string) {
  const clean = cleanSingleLine(value ?? "");
  return clean ? `${label}: ${clean}` : "";
}

function block(label: string, value?: string) {
  const clean = cleanBlock(value ?? "");
  return clean ? `${label}:\n${clean}` : "";
}

function cleanBlock(value: string) {
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => stripMarkdown(line).trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanSingleLine(value: string) {
  return cleanBlock(value).replace(/\s*\n\s*/g, " ").trim();
}

function stripMarkdown(value: string) {
  return value
    .replace(/^\s*["']?/, "")
    .replace(/["']?\s*$/, "")
    .replace(/^\s*[*_]+/, "")
    .replace(/[*_]+\s*$/, "")
    .trim();
}

function normalizeLabel(value: string) {
  return stripMarkdown(value)
    .replace(/\([^)]*\)/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function titleCase(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  const lower = clean.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function uniqueList(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const clean = cleanSingleLine(value);
    const key = clean.toLowerCase();

    if (clean && !seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }

  return result;
}

function formatSheetDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
