import { CompaniesView } from "@/components/companies-view";
import { CompanyLoadForm } from "@/components/forms/company-load-form";
import { PageHeader } from "@/components/page-header";
import {
  type ApplicationSummary,
  getApplicationSummariesByCompany,
} from "@/lib/application-source";
import { getCompaniesForDashboard } from "@/lib/company-source";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await getCompaniesForDashboard();
  const summaries = Object.fromEntries(
    await getApplicationSummariesByCompany(),
  ) as Record<string, ApplicationSummary>;

  console.log("[Company Dashboard] Rendering companies", {
    companyCount: companies.length,
    summaryCount: Object.keys(summaries).length,
  });

  return (
    <>
      <PageHeader
        title="Company Pipelines"
        description="Track every JD from upload to offer."
        action={<CompanyLoadForm />}
      />

      <CompaniesView companies={companies} summaries={summaries} />
    </>
  );
}
