import { redirect } from "next/navigation";

export default async function LegacyRsaCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  redirect(`/companies/${encodeURIComponent(companyId)}/rsa`);
}

