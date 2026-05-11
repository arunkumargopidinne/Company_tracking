import "server-only";

import OpenAI from "openai";
import { z } from "zod";

import {
  applyJobDescriptionFields,
  parseJobDescription,
  type ParsedJobDescription,
} from "./jd-parser";

const aiJobDescriptionSchema = z.object({
  companyName: z.string().default("").describe("Company name from the JD"),
  role: z.string().default("").describe("Job role/position title"),
  location: z.string().default("").describe("Job location/work location"),
  jobType: z.string().default("").describe("Job type (Full-time, Internship, Contract, etc)"),
  internshipDuration: z.string().default("").describe("Duration of internship if applicable"),
  stipend: z.string().default("").describe("Stipend amount if applicable"),
  ctc: z.string().default("").describe("CTC/salary package"),
  openings: z.string().default("").describe("Number of positions/openings"),
  eligibility: z.object({
    passoutYear: z.string().default("").describe("Required passout year"),
    education: z.string().default("").describe("Required education/degree"),
    departments: z.string().default("").describe("Eligible departments/branches"),
  }).describe("Eligibility criteria"),
  skillsRequired: z.array(z.string()).default([]).describe("Required technical and soft skills"),
  interviewProcess: z.object({
    mode: z.string().default("").describe("Interview mode (online, offline, hybrid)"),
    rounds: z.array(z.string()).default([]).describe("Interview rounds and their types"),
  }).describe("Interview process details"),
  workDetails: z.object({
    workingDays: z.string().default("").describe("Working days per week"),
    location: z.string().default("").describe("Work location details"),
    saturdayPolicy: z.string().default("").describe("Saturday working policy"),
    joining: z.string().default("").describe("Joining date"),
    relocation: z.string().default("").describe("Relocation policy"),
  }).describe("Work arrangement details"),
  bond: z.string().default("").describe("Bond or service agreement terms"),
  remarks: z.array(z.string()).default([]).describe("Additional remarks and notes"),
});

export async function parseJobDescriptionWithOpenAI(input: {
  raw: string;
  base?: ParsedJobDescription;
}) {
  const base = input.base ?? parseJobDescription(input.raw);

  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return {
      skipped: true,
      reason: "OPENAI_API_KEY is not configured.",
      job: base,
    };
  }

  try {
    const client = new OpenAI({ apiKey });
    
    const systemPrompt = `You are an expert at extracting structured information from job descriptions (JDs) in any format.
Extract the placement job description into structured JSON with the following schema.
- Use only facts present in the JD
- Normalize common placement terminology
- For missing values, use empty strings or empty arrays
- If education is "Any" or similar, use 'Any Degree' for education and 'Any Branch' for departments
- Always split skills and interview rounds into separate array items
- Extract all available information from the JD

Return ONLY valid JSON matching this exact structure:
{
  "companyName": "string",
  "role": "string",
  "location": "string",
  "jobType": "string",
  "internshipDuration": "string",
  "stipend": "string",
  "ctc": "string",
  "openings": "string",
  "eligibility": {
    "passoutYear": "string",
    "education": "string",
    "departments": "string"
  },
  "skillsRequired": ["string"],
  "interviewProcess": {
    "mode": "string",
    "rounds": ["string"]
  },
  "workDetails": {
    "workingDays": "string",
    "location": "string",
    "saturdayPolicy": "string",
    "joining": "string",
    "relocation": "string"
  },
  "bond": "string",
  "remarks": ["string"]
}`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4-turbo",
      max_completion_tokens: 4096,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Extract this job description:\n\n${input.raw}`,
        },
      ],
    });

    if (!response.choices?.[0]?.message?.content) {
      return {
        skipped: true,
        reason: "OpenAI returned an empty response.",
        job: base,
      };
    }

    const textContent = response.choices[0].message.content;
    if (typeof textContent !== "string") {
      return {
        skipped: true,
        reason: "OpenAI returned non-text response.",
        job: base,
      };
    }

    let parsedData;
    try {
      // Extract JSON from markdown code blocks if present
      let jsonStr = textContent;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[JD Import] Failed to parse OpenAI JSON response:", textContent);
      return {
        skipped: true,
        reason: `Failed to parse OpenAI response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        job: base,
      };
    }

    // Validate against schema
    const validated = aiJobDescriptionSchema.safeParse(parsedData);
    if (!validated.success) {
      console.warn("[JD Import] OpenAI response validation failed:", validated.error.flatten());
      return {
        skipped: true,
        reason: `Response validation failed: ${validated.error.flatten().fieldErrors}`,
        job: base,
      };
    }

    return {
      skipped: false,
      job: applyJobDescriptionFields(base, validated.data),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "OpenAI JD parsing failed.";
    console.error("[JD Import] OpenAI parsing error:", errorMessage);
    return {
      skipped: true,
      reason: errorMessage,
      job: base,
    };
  }
}
