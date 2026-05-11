import { AppShell } from "@/components/app-shell";

export default function PlacementLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
