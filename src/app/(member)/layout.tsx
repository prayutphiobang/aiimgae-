import MemberNav from "@/components/MemberNav";
import JobsProvider from "@/components/JobsProvider";
import MemberGuard from "@/components/MemberGuard";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <JobsProvider>
      <MemberNav />
      <MemberGuard>{children}</MemberGuard>
    </JobsProvider>
  );
}
