import { Prisma, Role } from '@prisma/client';
import prisma from '../config/db';
import redis from '../config/redis';

interface DashboardFilters {
  startDate?: string;
  endDate?: string;
}

export class DashboardService {
  private buildWhere(
    userId: string,
    role: Role,
    filters: DashboardFilters
  ): Prisma.FinancialRecordWhereInput {
    return {
      deletedAt: null,
      ...(role !== Role.ADMIN ? { userId } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            date: {
              ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
              ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            },
          }
        : {}),
    };
  }

  async getSummary(userId: string, role: Role, filters: DashboardFilters) {
    const cacheKey = `dashboard:summary:${userId}:${role}:${filters.startDate ?? ''}:${filters.endDate ?? ''}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where = this.buildWhere(userId, role, filters);

    const totals = await prisma.financialRecord.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    const incomeRow = totals.find((t) => t.type === 'INCOME');
    const expenseRow = totals.find((t) => t.type === 'EXPENSE');

    const totalIncome = Number(incomeRow?._sum.amount ?? 0);
    const totalExpenses = Number(expenseRow?._sum.amount ?? 0);

    const result = {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      incomeCount: incomeRow?._count.id ?? 0,
      expenseCount: expenseRow?._count.id ?? 0,
    };

    await redis.setex(cacheKey, 60, JSON.stringify(result));
    return result;
  }

  async getByCategory(userId: string, role: Role, filters: DashboardFilters) {
    const cacheKey = `dashboard:category:${userId}:${role}:${filters.startDate ?? ''}:${filters.endDate ?? ''}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where = this.buildWhere(userId, role, filters);

    const breakdown = await prisma.financialRecord.groupBy({
      by: ['category', 'type'],
      where,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const result = breakdown.map((row) => ({
      category: row.category,
      type: row.type,
      total: Number(row._sum.amount ?? 0),
      count: row._count.id,
    }));

    await redis.setex(cacheKey, 60, JSON.stringify(result));
    return result;
  }

  async getTrend(userId: string, role: Role, filters: DashboardFilters) {
    const cacheKey = `dashboard:trend:${userId}:${role}:${filters.startDate ?? ''}:${filters.endDate ?? ''}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Use raw SQL for date_trunc (not available in Prisma groupBy)
    const userFilter =
      role !== Role.ADMIN ? Prisma.sql`AND fr."userId" = ${userId}` : Prisma.empty;

    const startFilter = filters.startDate
      ? Prisma.sql`AND fr.date >= ${new Date(filters.startDate)}`
      : Prisma.empty;

    const endFilter = filters.endDate
      ? Prisma.sql`AND fr.date <= ${new Date(filters.endDate)}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<
      { week: Date; type: string; total: string; count: string }[]
    >`
      SELECT
        DATE_TRUNC('week', fr.date) AS week,
        fr.type,
        SUM(fr.amount)::text AS total,
        COUNT(fr.id)::text AS count
      FROM financial_records fr
      WHERE fr."deletedAt" IS NULL
        ${userFilter}
        ${startFilter}
        ${endFilter}
      GROUP BY week, fr.type
      ORDER BY week DESC
      LIMIT 24
    `;

    const result = rows.map((row) => ({
      week: row.week,
      type: row.type,
      total: Number(row.total),
      count: Number(row.count),
    }));

    await redis.setex(cacheKey, 60, JSON.stringify(result));
    return result;
  }

  async getRecentRecords(userId: string, role: Role, limit = 10) {
    const where: Prisma.FinancialRecordWhereInput = {
      deletedAt: null,
      ...(role !== Role.ADMIN ? { userId } : {}),
    };

    return prisma.financialRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      take: Math.min(limit, 50),
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }
}

export const dashboardService = new DashboardService();