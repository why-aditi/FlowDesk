import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/workspace");
  }
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-semibold text-base sm:text-lg text-foreground hover:text-muted-foreground transition-colors"
          >
            FlowDesk
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <Button asChild size="sm" className="text-xs sm:text-sm">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20 md:py-28 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
            Knowledge workers spend 41% of their time on busywork. FlowDesk
            gives it back.
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            The tools you use — email, docs, calendars, chat — don&apos;t talk to
            each other. You become the integration layer. We fix that.
          </p>
          <div className="mt-8 sm:mt-10">
            <Button asChild size="lg" className="text-sm sm:text-base px-6 sm:px-8">
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </section>

        <section
          id="features"
          className="max-w-6xl mx-auto px-4 py-12 sm:py-16 md:py-20"
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-foreground mb-8 sm:mb-12">
            Built for how you work
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Smart Inbox</CardTitle>
                <CardDescription>
                  Paste any email, message, or notification. AI returns who sent
                  it, what action is required, the deadline, and priority.
                  Inbox anxiety gone.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <Button asChild variant="outline" size="sm">
                  <Link href="/workspace/inbox">Try Smart Inbox</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Research Copilot</CardTitle>
                <CardDescription>
                  Type any topic or upload a PDF. Get a structured outline, key
                  arguments, important terms, suggested questions, and a draft
                  introduction. Research scaffolding in seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <Button asChild variant="outline" size="sm">
                  <Link href="/workspace/research">Try Research Copilot</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Meeting Summarizer</CardTitle>
                <CardDescription>
                  Paste any meeting or call transcript. AI extracts a clean
                  summary, decisions made, action items with owners and
                  deadlines, and open questions. Never lose context again.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <Button asChild variant="outline" size="sm">
                  <Link href="/workspace/meetings">Try Meeting Summarizer</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16 md:py-20">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-foreground mb-8 sm:mb-12">
            How FlowDesk differs from existing tools
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px] sm:w-[180px] text-xs sm:text-sm">Tool</TableHead>
                  <TableHead className="text-xs sm:text-sm">What it does</TableHead>
                  <TableHead className="bg-muted/50 font-medium text-xs sm:text-sm">
                    What FlowDesk does instead
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    Notion / Obsidian
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    Organizes notes you write manually
                  </TableCell>
                  <TableCell className="bg-muted/30">
                    Reads any content you paste and processes it automatically
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Notion AI</TableCell>
                  <TableCell className="text-muted-foreground">
                    AI inside Notion — only works on Notion content
                  </TableCell>
                  <TableCell className="bg-muted/30">
                    AI across all your content: emails, transcripts, PDFs, any
                    text
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">ChatGPT</TableCell>
                  <TableCell className="text-muted-foreground">
                    General-purpose chat — you do the prompting
                  </TableCell>
                  <TableCell className="bg-muted/30">
                    Purpose-built workflows: one click, structured output, saved
                    to your account
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    Google Calendar
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    Manages events you create manually
                  </TableCell>
                  <TableCell className="bg-muted/30">
                    Creates recurring automations from plain English descriptions
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    Confluence / Coda
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    Team wikis — you write and maintain them
                  </TableCell>
                  <TableCell className="bg-muted/30">
                    AI builds the knowledge base automatically from meeting
                    summaries
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>

        <section
          id="pricing"
          className="max-w-6xl mx-auto px-4 py-12 sm:py-16 md:py-20"
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-foreground mb-6 sm:mb-12">
            Pricing
          </h2>
          <p className="text-center text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-2">
            FlowDesk is free to get started. Upgrade when you need more power.
          </p>
        </section>
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              href="#pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
          <p className="text-sm text-muted-foreground">FlowDesk</p>
        </div>
      </footer>
    </div>
  );
}
