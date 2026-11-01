import { AuthPage } from "@/components/auth-form";
import { safeReturnPath } from "@/lib/auth";
export const metadata = { title: "Create account" };
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { next } = await searchParams;
  return <AuthPage variant="signup" returnPath={safeReturnPath(typeof next === "string" ? next : null)} />;
}
