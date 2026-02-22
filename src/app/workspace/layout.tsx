import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const workspaceUser = {
    id: user.id,
    email: user.email ?? "",
    full_name: (user.user_metadata?.full_name as string) ?? undefined,
  };

  return (
    <WorkspaceShell user={workspaceUser}>
      {children}
    </WorkspaceShell>
  );
}
