-- NextReach MVP schema
-- Supports deterministic chatbot sessions, message transcript audit,
-- and sales-facing lead review.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,

  current_step text not null default 'GREETING',
  status text not null default 'active',

  visitor_fingerprint text,
  message_count integer not null default 0,
  spam_score numeric(5, 2) not null default 0,
  spam_flags jsonb not null default '[]'::jsonb,
  collected_fields jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  constraint chat_sessions_current_step_check check (
    current_step in (
      'GREETING',
      'INTENT',
      'COMPANY_CONTEXT',
      'NEED_DETAILS',
      'URGENCY',
      'CONTACT_INFO',
      'CONFIRMATION',
      'COMPLETE',
      'FALLBACK_REPAIR',
      'SPAM_GUARD'
    )
  ),
  constraint chat_sessions_status_check check (
    status in ('active', 'completed', 'abandoned', 'spam_blocked')
  ),
  constraint chat_sessions_message_count_check check (message_count >= 0),
  constraint chat_sessions_spam_score_check check (spam_score >= 0)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,

  created_at timestamptz not null default now(),
  sender text not null,
  step text not null,
  content text not null,

  ai_extraction jsonb,
  ai_confidence numeric(4, 3),
  extraction_status text not null default 'not_requested',
  flags jsonb not null default '[]'::jsonb,

  constraint chat_messages_sender_check check (
    sender in ('user', 'bot', 'system')
  ),
  constraint chat_messages_step_check check (
    step in (
      'GREETING',
      'INTENT',
      'COMPANY_CONTEXT',
      'NEED_DETAILS',
      'URGENCY',
      'CONTACT_INFO',
      'CONFIRMATION',
      'COMPLETE',
      'FALLBACK_REPAIR',
      'SPAM_GUARD'
    )
  ),
  constraint chat_messages_extraction_status_check check (
    extraction_status in ('not_requested', 'completed', 'fallback_used', 'failed')
  ),
  constraint chat_messages_ai_confidence_check check (
    ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)
  )
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status text not null default 'new',
  quality text not null default 'low',
  score integer not null default 0,

  intent text not null default 'unknown',
  urgency text not null default 'unknown',

  name text,
  email text,
  phone text,
  company text,
  website text,
  platform text,
  company_size text,

  need_summary text,
  lead_summary text,

  missing_fields jsonb not null default '[]'::jsonb,
  extracted_fields jsonb not null default '{}'::jsonb,
  ai_summary jsonb not null default '{}'::jsonb,
  scoring_breakdown jsonb not null default '{}'::jsonb,
  spam_flags jsonb not null default '[]'::jsonb,

  source text not null default 'landing_chatbot',
  notes text,

  constraint leads_status_check check (
    status in ('new', 'reviewed', 'archived', 'spam')
  ),
  constraint leads_quality_check check (
    quality in ('low', 'medium', 'high')
  ),
  constraint leads_score_check check (
    score >= 0 and score <= 10
  ),
  constraint leads_intent_check check (
    intent in ('pricing', 'demo', 'integration', 'general', 'other', 'unknown')
  ),
  constraint leads_urgency_check check (
    urgency in ('immediate', 'this_month', 'later', 'researching', 'unknown')
  )
);

create trigger set_chat_sessions_updated_at
before update on public.chat_sessions
for each row
execute function public.set_updated_at();

create trigger set_leads_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

create index chat_sessions_status_created_at_idx
on public.chat_sessions (status, created_at desc);

create index chat_sessions_visitor_fingerprint_idx
on public.chat_sessions (visitor_fingerprint)
where visitor_fingerprint is not null;

create index chat_messages_session_created_at_idx
on public.chat_messages (session_id, created_at asc);

create index leads_created_at_idx
on public.leads (created_at desc);

create index leads_status_created_at_idx
on public.leads (status, created_at desc);

create index leads_quality_idx
on public.leads (quality);

create index leads_intent_idx
on public.leads (intent);

create index leads_urgency_idx
on public.leads (urgency);

create index leads_session_id_idx
on public.leads (session_id)
where session_id is not null;
