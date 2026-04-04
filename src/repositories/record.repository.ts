import { FinancialRecord, Prisma, RecordType, Role } from '@prisma/client';
import prisma from '../config/db';

export interface RecordFilters {
  type?: RecordType;
  category?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'date' | 'amount' | 'createdAt';
  order?: 'asc' | 'desc';
  search?: string;
  page: number;
  limit: number;
  skip: number;
}

export class RecordRepository {
  private buildWhereClause(
    filters: RecordFilters,
    userId: string,
    role: Role
  ): Prisma.FinancialRecordWhereInput {
    return {
      deletedAt: null,
      ...(role !== Role.ADMIN ? { userId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.category ? { category: { contains: filters.category, mode: 'insensitive' } } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            date: {
              ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
              ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { description: { contains: filters.search, mode: 'insensitive' } },
              { category: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async create(data: Prisma.FinancialRecordCreateInput): Promise<FinancialRecord> {
    return prisma.financialRecord.create({ data });
  }

  async findById(id: string): Promise<FinancialRecord | null> {
    return prisma.financialRecord.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findMany(
    filters: RecordFilters,
    userId: string,
    role: Role
  ): Promise<{ records: FinancialRecord[]; total: number }> {
    const where = this.buildWhereClause(filters, userId, role);

    const [records, total] = await prisma.$transaction([
      prisma.financialRecord.findMany({
        where,
        skip: filters.skip,
        take: filters.limit,
        orderBy: { [filters.sortBy ?? 'date']: filters.order ?? 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.financialRecord.count({ where }),
    ]);

    return { records, total };
  }

  async update(id: string, data: Prisma.FinancialRecordUpdateInput): Promise<FinancialRecord> {
    return prisma.financialRecord.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<FinancialRecord> {
    return prisma.financialRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<FinancialRecord> {
    return prisma.financialRecord.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async findDeletedById(id: string): Promise<FinancialRecord | null> {
    return prisma.financialRecord.findFirst({
      where: { id, deletedAt: { not: null } },
    });
  }
}

export const recordRepository = new RecordRepository();