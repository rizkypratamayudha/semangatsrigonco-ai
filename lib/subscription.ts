import { prisma } from './prisma';

/**
 * Checks if a user's subscription has expired and automatically downgrades them to the free tier if it has.
 * Returns the current/updated tier of the user.
 * 
 * This uses Prisma directly to bypass Supabase RLS policies and ensure
 * that the update succeeds regardless of who is calling it (e.g. anonymous chat widget requests).
 * 
 * @param userId The ID of the user to check
 */
export async function checkAndApplySubscriptionExpiration(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, subscriptionExpiresAt: true },
    });

    if (!user) {
      return 'free';
    }

    // If they are not on the free plan and have an expiration date
    if (
      user.tier !== 'free' &&
      user.subscriptionExpiresAt &&
      new Date() > new Date(user.subscriptionExpiresAt)
    ) {
      console.log(`Subscription for user ${userId} has expired. Downgrading to FREE.`);
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          tier: 'free',
          subscriptionExpiresAt: null, // Clear expiration date
        },
        select: { tier: true },
      });
      
      return updatedUser.tier || 'free';
    }

    return user.tier || 'free';
  } catch (error) {
    console.error(`Error checking subscription expiration for user ${userId}:`, error);
    // Return free fallback or assume current state if DB check fails
    return 'free';
  }
}
