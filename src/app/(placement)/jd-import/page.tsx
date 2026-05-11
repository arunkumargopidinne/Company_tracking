import { CompanyLoadForm } from "@/components/forms/company-load-form";
import { PageHeader } from "@/components/page-header";

export default function JdImportPage() {
  return (
    <div>
      <PageHeader
        title="JD Import"
        action={<CompanyLoadForm />}
      />
    </div>
  );
}
