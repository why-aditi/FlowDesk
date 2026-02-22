import Link from "next/link";
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

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-semibold text-lg text-foreground hover:text-muted-foreground transition-colors"
          >
            FlowDesk
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
            Knowledge workers spend 41% of their time on busywork. FlowDesk
            gives it back.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            The tools you use — email, docs, calendars, chat — don&apos;t talk to
            each other. You become the integration layer. We fix that.
          </p>
          <div className="mt-10">
            <Link href="/signup">
              <Button size="lg" className="text-base px-8">
                Get Started Free
              </Button>
            </Link>
          </div>
        </section>

        <section
          id="features"
          className="max-w-6xl mx-auto px-4 py-16 md:py-20"
        >
          <h2 className="text-2xl md:text-3xl font-semibold text-center text-foreground mb-12">
            Built for how you work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <Link href="/workspace/inbox">
                  <Button variant="outline" size="sm">
                    Try Smart Inbox
                  </Button>
                </Link>
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
                <Link href="/workspace/research">
                  <Button variant="outline" size="sm">
                    Try Research Copilot
                  </Button>
                </Link>
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
                <Link href="/workspace/meetings">
                  <Button variant="outline" size="sm">
                    Try Meeting Summarizer
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <h2 className="text-2xl md:text-3xl font-semibold text-center text-foreground mb-12">
            How FlowDesk differs from existing tools
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Tool</TableHead>
                  <TableHead>What it does</TableHead>
                  <TableHead className="bg-muted/50 font-medium">
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
            <Link href="/signup">
              <Button variant="outline" size="sm">
                Sign Up
              </Button>
            </Link>
          </nav>
          <p className="text-sm text-muted-foreground">FlowDesk</p>
        </div>
      </footer>
    </div>
  );
}
