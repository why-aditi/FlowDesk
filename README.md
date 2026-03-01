# FlowDesk

Knowledge workers spend 41% of their time on busywork. **FlowDesk** gives it back.

The tools you use — email, docs, calendars, chat — don't talk to each other. You become the integration layer. FlowDesk fixes that by acting as your AI-powered central nervous system.

---

## The Problem & Use Case
Modern professionals (founders, managers, researchers, executives) suffer from severe context switching. You get an action item in a Zoom call, a deadline in an email, and a strategy doc in a PDF. Keeping track of everything involves manually copying and pasting across 5 different tools. 

**FlowDesk** is built for anyone who wants to stop managing work and start doing it. It turns unstructured incoming noise into perfectly organized, trackable, and automated workflows.

## How It Works
1. **Ingest**: Paste raw text, emails, or meeting transcripts, or upload PDFs directly into your workspace.
2. **Process**: Our AI engines (powered by Gemini and Groq) instantly structure the data. They extract what matters: who is responsible, deadlines, priorities, and decisions made.
3. **Organize**: The processed data is saved as structured `Notes` and actionable `Tasks`.
4. **Execute**: Manage your extracted tasks through the Daily Planner, receive desktop notifications for reminders, and set up recurring automations using plain English.

---

## Core Features

### 📥 Smart Inbox
- **What it does**: Triage emails, Slack messages, or any notifications instantly.
- **AI Magic**: Categorizes the message, assesses priority (`high`, `medium`, `low`), identifies the sender, extracts hard deadlines, and pulls out specific action items.

### 🧠 Research Copilot
- **What it does**: Scaffolds research for reports, essays, or strategy docs in seconds.
- **AI Magic**: Provide a topic or a long PDF, and FlowDesk will generate a clear thesis, a structured section-by-section outline (with key points and sources), important terms, and a draft introduction.

### 🎙️ Meeting Summarizer
- **What it does**: Turns chaotic meeting transcripts into clean, usable documentation.
- **AI Magic**: Extracts a comprehensive summary, records a list of decisions made, flags open questions, and assigns action items to specific owners with due dates.

### ✅ Task Management & Automation
- **What it does**: A fully-fledged task tracker with statuses, due dates, and reminders.
- **AI Magic**: Automate your repetitive tasks. Tell FlowDesk "Send my team a report every Friday", and the AI parses the natural language to set up a recurring cron job and auto-generate the underlying task exactly when you need it.

### 📅 Daily Time-Blocking Planner
- **What it does**: Plan your day hour-by-hour to ensure maximum focus.
- **Tracking**: Logs your hourly completion rate and tracks your progress statistics over the last 30 days so you can see your productivity trends.

### 🤝 Workspaces & Teams
- **What it does**: Work doesn't happen in a vacuum. Create teams, invite members, and share your workspace context so everyone is aligned on the latest meeting notes and tasks.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI/Styling**: [React](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **Backend/Auth**: [Supabase](https://supabase.com/)
- **AI Integrations**: [Google Generative AI](https://ai.google.dev/), [Groq](https://groq.com/)
- **Forms/Validation**: React Hook Form, Zod

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up your environment variables (e.g., in `.env.local`):

```bash
# App Information
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Supabase Auth & Database
NEXT_PUBLIC_SUPABASE_URL="https://your-project-url.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SEND_EMAIL_HOOK_SECRET="your-webhook-secret-for-email"

# AI Providers
GEMINI_API_KEY="your-google-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"

# Email Configuration (SMTP/Resend)
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
SMTP_FROM="FlowDesk <onboarding@resend.dev>"
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.
