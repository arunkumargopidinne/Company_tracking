# JD Extraction Enhancement Guide

## Overview

The JD (Job Description) extraction system has been enhanced with AI-powered parsing to handle job descriptions in any format. The system now uses a two-tier approach:

1. **Rule-Based Parser (Fast)** - Extracts JD data using pattern matching for common JD formats
2. **AI Enhancement (Intelligent)** - Uses OpenAI's GPT-4 Turbo to intelligently extract JD data from any format

## How It Works

### Step 1: Rule-Based Parsing
When you paste a JD, the system first attempts to parse it using pattern matching. This works for JDs with standard formatting like:

```
Company: Tech Corp
Role: Software Engineer
Location: Bangalore
...
```

### Step 2: AI Enhancement (Auto-Triggered)
If the rule-based parser misses critical fields, the system automatically calls OpenAI's API to intelligently extract the missing information. This handles JDs in any format, including:

- **Unstructured text** - Just plain text without section headers
- **PDF extracts** - Text copied directly from PDFs
- **Email format** - JDs sent in email body
- **Mixed formats** - Combination of bullets, paragraphs, and structured sections
- **Different languages** (translated content)

## What Gets Extracted

The system extracts and normalizes the following information:

- **Company Name** - Name of the recruiting company
- **Job Role** - Position title or designation
- **Location** - Work location or work mode (Remote/Hybrid/Onsite)
- **Job Type** - Full-time, Internship, Contract, etc.
- **Duration** - For internships (months/weeks)
- **Stipend** - For internship positions
- **CTC/Package** - Salary or post-internship compensation
- **Openings** - Number of positions available
- **Eligibility** - Required passout year, education, departments
- **Skills Required** - Technical and soft skills
- **Interview Process** - Interview mode and rounds (e.g., Online Assessment, Technical, HR, etc.)
- **Work Details** - Working days, joining date, relocation policy
- **Bond** - Service agreement or bond terms
- **Remarks** - Additional notes and requirements

## Configuration

### API Key Setup

The system uses your OpenAI API key from the `.env.local` file:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo
```

**To update the API key:**

1. Open `.env.local` in the project root
2. Replace the `OPENAI_API_KEY` value with your valid OpenAI API key
3. Restart the development server

### Getting an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key and paste it in `.env.local`

## Using the JD Extractor

### In the UI

1. Click the **"Load Job"** button in the Companies view
2. Paste your JD text (any format) in the modal
3. Click **"Import"** button
4. The system will:
   - Parse the JD using rule-based patterns
   - Auto-enhance with AI if needed
   - Display extraction results
   - Save to Google Sheets (if configured)

### Expected Behavior

**Success:**
- JD successfully extracted and stored
- Extracted fields displayed in confirmation
- Data synced to Google Sheets

**Partial Extraction (AI Enhancement):**
- System auto-triggered AI parsing
- Message shows "JD enhanced with AI"
- Some fields may be empty (not found in JD)

**Failure:**
- Critical fields missing (Company Name, Role, Location, Skills, Interview Process, etc.)
- Error message lists which fields couldn't be extracted
- You can:
  - Revise the JD text and try again
  - Manually enter missing fields in the UI
  - Check the extracted data in error response

## JD Format Examples

### Standard Format (Rule-Based Parser Works Well)
```
Company Name: TechCorp
Role: Software Engineer
Location: Bangalore, India
Job Type: Full-time
Openings: 5
Skills Required: Java, Spring Boot, PostgreSQL, Docker
Interview Process:
  - Online Assessment (1 hour, DSA)
  - Technical Round 1 (1.5 hours)
  - Technical Round 2 (1.5 hours)
  - HR Round
Eligibility:
  Passout Year: 2024-2025
  Education: B.Tech, B.E, M.Tech
  Departments: CSE, IT, ECE
Bond: 2 years
```

### Unstructured Format (AI Enhancement Works)
```
TechCorp is hiring! We're looking for Software Engineers to join our India office in Bangalore.

We need talented developers with experience in Java, Spring Boot, and PostgreSQL. Docker knowledge is a plus.

The position is full-time, and we have 5 openings. 

Interview process:
1. 1-hour online assessment focusing on DSA
2. 1.5-hour technical round 1
3. 1.5-hour technical round 2  
4. HR interview

We're looking for B.Tech / B.E / M.Tech graduates in CSE, IT, or ECE, ideally with 2024-2025 graduation dates.

There's a 2-year bond on this role.
```

### Email Format (AI Enhancement Works)
```
Hi Placement Team,

We have an internship opportunity at TechCorp for 3 months.

Position: Software Engineer Intern
Location: Remote
Stipend: ₹25,000/month

Required Skills:
- Python
- Django
- MySQL

Interview: 
- Assessment + Coding Round
- Technical Interview
- HR

Any BE/BTech/MTech from CSE/IT/ECE, 2024-2025 graduates preferred.
No bond.

Let me know if you have interested candidates!
```

## Troubleshooting

### "Company name could not be extracted"
- The JD must clearly mention the company name
- Try using formats like "Company: XYZ" or "From XYZ Corp"

### "Skills are required and could not be extracted"
- Ensure skills section exists in the JD
- Skills should be clearly listed, separated by commas or bullets

### "Interview process is required and could not be extracted"
- The JD must mention interview rounds
- Examples: "Online Assessment", "Technical Round", "HR Round"

### "Location could not be extracted"
- Always include work location or work mode
- Accepted values: City names, "Remote", "Hybrid", "Onsite", etc.

### OpenAI API Errors
- Check that your API key is valid and has available credits
- Check internet connectivity
- Check the OpenAI API status at https://status.openai.com

### Rate Limiting
If you see rate limit errors:
- Wait a few moments before trying again
- Consider batching multiple JDs
- Check your OpenAI rate limits at https://platform.openai.com/account/rate-limits

## Performance & Costs

- **Rule-based parsing**: Free, instant (< 100ms)
- **AI Enhancement**: Charged by OpenAI (~$0.01-0.05 per JD)
- **When triggered**: Only when rule-based parsing is incomplete

## Best Practices

1. **Paste complete JDs** - Include all relevant sections
2. **Ensure clarity** - Avoid extremely compressed or poorly formatted text
3. **Use section headers** - Helps both parsers (Company, Role, Location, etc.)
4. **Include all details** - More information = better extraction
5. **Check results** - Review extracted data before final submission
6. **Monitor costs** - AI enhancement uses your OpenAI credits

## API Response Details

When submitting a JD, you'll get detailed feedback:

```json
{
  "ok": true,
  "aiEnhancementUsed": false,
  "parsed": {
    "companyName": "TechCorp",
    "role": "Software Engineer",
    "location": "Bangalore",
    "skillsRequired": ["Java", "Spring Boot"],
    "rounds": ["Online Assessment", "Technical Round"],
    ...
  },
  "message": "JD parsed and stored for TechCorp."
}
```

- `aiEnhancementUsed: true` → AI was used to enhance extraction
- `aiEnhancementUsed: false` → Rule-based parsing was sufficient

## Future Improvements

- Batch JD processing for multiple companies
- Support for structured formats (JSON, CSV)
- Multi-language support enhancement
- Custom field extraction based on college preferences
- Integration with LinkedIn job postings

## Support & Questions

For issues or questions about JD extraction:
1. Check this guide first
2. Review error messages - they're detailed
3. Check browser console for additional logs
4. Verify `.env.local` has valid OpenAI API key
