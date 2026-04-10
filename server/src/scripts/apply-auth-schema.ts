import 'dotenv/config';
import { Client } from 'pg';

const statements = [
  `alter table users add column if not exists password_hash varchar(255)`,
  `alter table users add column if not exists google_id varchar(255)`,
  `alter table users add column if not exists image text`,
  `alter table users add column if not exists email_verified boolean not null default false`,
  `alter table users add column if not exists poster_email_verified boolean not null default false`,
  `alter table users add column if not exists is_poster_verified boolean not null default false`,
  `alter table users add column if not exists updated_at timestamp not null default now()`,
  `create unique index if not exists users_google_id_unique on users (google_id) where google_id is not null`,
  `create table if not exists accounts (
    id varchar(255) primary key,
    provider_id varchar(100) not null,
    account_id varchar(255) not null,
    user_id integer not null references users(id) on delete cascade,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp,
    refresh_token_expires_at timestamp,
    scope text,
    password text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
  )`,
  `create unique index if not exists accounts_provider_account_uniq on accounts (provider_id, account_id)`,
  `create index if not exists accounts_user_idx on accounts (user_id)`,
  `create table if not exists sessions (
    id varchar(255) primary key,
    token varchar(255) not null,
    user_id integer not null references users(id) on delete cascade,
    expires_at timestamp not null,
    ip_address varchar(255),
    user_agent text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
  )`,
  `create unique index if not exists sessions_token_uniq on sessions (token)`,
  `create index if not exists sessions_user_idx on sessions (user_id)`,
  `create index if not exists sessions_expires_idx on sessions (expires_at)`,
  `create table if not exists verifications (
    id varchar(255) primary key,
    identifier varchar(255) not null,
    value text not null,
    expires_at timestamp not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
  )`,
  `create index if not exists verifications_identifier_idx on verifications (identifier)`,
  `create index if not exists verifications_expires_idx on verifications (expires_at)`,
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    for (const statement of statements) {
      await client.query(statement);
    }
    console.log('Applied Better Auth schema changes.');
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error('Failed to apply Better Auth schema:', error);
  process.exit(1);
});
