import { db } from '../db/index.js';
import { prices } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const isNightPackageTimeValid = (): boolean => {
  // Night package is valid between 22:00 and 05:00
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false };
  const jakartaHourStr = new Intl.DateTimeFormat('en-GB', options).format(now);
  const hour = parseInt(jakartaHourStr);

  return hour >= 22 || hour < 5;
};

export const getPriceDetails = async (priceId: number) => {
  const priceRes = await db.select().from(prices).where(eq(prices.id, priceId));
  if (priceRes.length === 0) return null;
  return priceRes[0];
};

export const generateTrxNumber = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `TRX-${dateStr}-${randomStr}`;
};
