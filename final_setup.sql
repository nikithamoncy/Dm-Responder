-- ==============================================================================
-- FINAL SETUP SCRIPT (Error-Free & Idempotent)
-- Run this in Supabase SQL Editor to set up the entire database.
-- ==============================================================================

-- 1. Enable Vector Extension (if not already enabled)
create extension if not exists vector;

-- 2. Bot Settings Table
create table if not exists bot_settings (
  id bigint primary key generated always as identity,
  system_prompt text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Bot Settings
alter table bot_settings enable row level security;

do $$ begin
  create policy "Allow public read access" on bot_settings for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Allow public insert access" on bot_settings for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Allow public update access" on bot_settings for update using (true);
exception when duplicate_object then null; end $$;

-- Insert default prompt if missing
insert into bot_settings (system_prompt)
select 'You are a helpful assistant for our Instagram page.'
where not exists (select 1 from bot_settings);


-- 3. Knowledge Base Items
create table if not exists knowledge_base_items (
  id uuid default gen_random_uuid() primary key,
  filename text not null,
  content_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Knowledge Base Vectors (Adjusted to 768 dimensions for gemini-embedding-001)
create table if not exists knowledge_base_vectors (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references knowledge_base_items(id) on delete cascade,
  content text not null,
  embedding vector(768) -- Matches Gemini Embedding 001
);

-- Index for fast search (IVFFlat is good for starter, HNSW is better but more complex to setup initially if empty)
-- We use a simple index creation that won't fail if empty
create index if not exists knowledge_base_vectors_idx 
on knowledge_base_vectors using ivfflat (embedding vector_cosine_ops)
with (lists = 100);


-- 5. Match Function (RPC)
create or replace function match_knowledge_base (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    knowledge_base_vectors.id,
    knowledge_base_vectors.content,
    1 - (knowledge_base_vectors.embedding <=> query_embedding) as similarity
  from knowledge_base_vectors
  where 1 - (knowledge_base_vectors.embedding <=> query_embedding) > match_threshold
  order by knowledge_base_vectors.embedding <=> query_embedding
  limit match_count;
end;
$$;


-- 6. Conversation States
create table if not exists conversation_states (
  user_id text primary key,
  is_paused boolean default false,
  last_message_at timestamp with time zone default timezone('utc'::text, now()),
  user_name text,
  username text,
  profile_pic text,
  analysis jsonb
);

alter table conversation_states enable row level security;

do $$ begin
  create policy "Allow public access to conversation_states" on conversation_states for all using (true) with check (true);
exception when duplicate_object then null; end $$;


-- 7. Conversation History
create table if not exists conversation_history (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_conversation_history_user_id on conversation_history (user_id);


-- 8. Leads
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  user_id text not null references conversation_states(user_id),
  email text,
  phone text,
  status text default 'new',
  source_message text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table leads enable row level security;

do $$ begin
  create policy "Allow public access to leads" on leads for all using (true) with check (true);
exception when duplicate_object then null; end $$;


-- 9. Processed Messages (Idempotency)
create table if not exists processed_messages (
  message_id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Done!
