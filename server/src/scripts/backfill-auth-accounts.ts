import 'dotenv/config';
import { eq, isNull, not, or } from 'drizzle-orm';
import { db } from '../db';
import { accounts, users } from '../db/schema';

async function main(): Promise<void> {
  const legacyUsers = await db
    .select()
    .from(users)
    .where(or(not(isNull(users.passwordHash)), not(isNull(users.googleId))));

  for (const user of legacyUsers) {
    if (user.passwordHash) {
      await db
        .insert(accounts)
        .values({
          id: `legacy-credential-${user.id}`,
          providerId: 'credential',
          accountId: user.email,
          userId: user.id,
          password: user.passwordHash,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .onConflictDoNothing();
    }

    if (user.googleId) {
      await db
        .insert(accounts)
        .values({
          id: `legacy-google-${user.id}`,
          providerId: 'google',
          accountId: user.googleId,
          userId: user.id,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .onConflictDoNothing();
    }
  }

  const posterVerifiedUsers = legacyUsers.filter((user) => user.emailVerified && !user.posterEmailVerified);
  for (const user of posterVerifiedUsers) {
    await db
      .update(users)
      .set({
        posterEmailVerified: true,
      })
      .where(eq(users.id, user.id));
  }

  console.log(`Backfilled auth accounts for ${legacyUsers.length} legacy users.`);
}

void main().catch((error) => {
  console.error('Auth backfill failed:', error);
  process.exit(1);
});
