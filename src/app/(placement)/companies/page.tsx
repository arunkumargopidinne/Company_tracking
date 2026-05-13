import { CompaniesView } from "@/components/companies-view";
import { CompanyLoadForm } from "@/components/forms/company-load-form";
import { PageHeader } from "@/components/page-header";
import {
  type ApplicationSummary,
  getApplicationSummariesByCompany,
} from "@/lib/application-source";
import { getCompaniesForDashboard } from "@/lib/company-source";
import { getCurrentSessionUser, isReadOnlyRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const [companies, summaryEntries, sessionUser] = await Promise.all([
    getCompaniesForDashboard(),
    getApplicationSummariesByCompany(),
    getCurrentSessionUser(),
  ]);
  const summaries = Object.fromEntries(
    summaryEntries,
  ) as Record<string, ApplicationSummary>;
  const readOnly = isReadOnlyRole(sessionUser?.role);

  console.log("[Company Dashboard] Rendering companies", {
    companyCount: companies.length,
    summaryCount: Object.keys(summaries).length,
  });

  return (
    <>
      <PageHeader
        title="Company Pipelines"
        description="Track every JD from upload to offer."
        action={readOnly ? undefined : <CompanyLoadForm />}
      />

      <CompaniesView companies={companies} summaries={summaries} readOnly={readOnly} />
    </>
  );
}
