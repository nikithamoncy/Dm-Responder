-- Update the knowledge_base_vectors table to support 3072 dimensions using halfvec index
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing index (if it exists)
drop index if exists knowledge_base_vectors_idx;

-- 2. Alter the column type to 3072 dimensions
alter table knowledge_base_vectors 
alter column embedding type vector(3072);

-- 3. Create a new HNSW index using halfvec (Supports >2000 dimensions)
create index knowledge_base_vectors_idx 
on knowledge_base_vectors using hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

-- 4. Update the matching function
-- Note: We keep the function utilizing vector(3072) as the input/output.
create or replace function match_knowledge_base (
  query_embedding vector(3072),
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
