import { FinancialRecord, Role } from '@prisma/client';
import { recordRepository, RecordFilters } from '../repositories/record.repository';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { CreateRecordInput, UpdateRecordInput } from '../schemas/record.schema';
import { parsePagination, buildMeta } from '../utils/pagination';

export class RecordService {
  async createRecord(
    input: CreateRecordInput,
    userId: string
  ): Promise<FinancialRecord> {
    return recordRepository.create({
      amount: input.amount,
      type: input.type,
      category: input.category,
      date: new Date(input.date),
      description: input.description,
      user: { connect: { id: userId } },
    });
  }

  async getRecords(
    query: Record<string, unknown>,
    userId: string,
    role: Role
  ) {
    const { page, limit, skip } = parsePagination(query);

    const filters: RecordFilters = {
      type: query.type as RecordFilters['type'],
      category: query.category as string | undefined,
      startDate: query.startDate as string | undefined,
      endDate: query.endDate as string | undefined,
      sortBy: (query.sortBy as RecordFilters['sortBy']) ?? 'date',
      order: (query.order as RecordFilters['order']) ?? 'desc',
      search: query.search as string | undefined,
      page,
      limit,
      skip,
    };

    const { records, total } = await recordRepository.findMany(filters, userId, role);
    return { records, meta: buildMeta(total, page, limit) };
  }

  async getRecordById(
    id: string,
    userId: string,
    role: Role
  ): Promise<FinancialRecord> {
    const record = await recordRepository.findById(id);
    if (!record) throw new NotFoundError('Financial record');

    if (role !== Role.ADMIN && record.userId !== userId) {
      throw new ForbiddenError('You do not have access to this record');
    }

    return record;
  }

  async updateRecord(
    id: string,
    input: UpdateRecordInput,
    userId: string,
    role: Role
  ): Promise<FinancialRecord> {
    const record = await recordRepository.findById(id);
    if (!record) throw new NotFoundError('Financial record');

    if (role === Role.ANALYST && record.userId !== userId) {
      throw new ForbiddenError('You can only update your own records');
    }

    return recordRepository.update(id, {
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.date !== undefined ? { date: new Date(input.date) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    });
  }

  async deleteRecord(
    id: string,
    userId: string,
    role: Role
  ): Promise<void> {
    const record = await recordRepository.findById(id);
    if (!record) throw new NotFoundError('Financial record');

    if (role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can delete records');
    }

    await recordRepository.softDelete(id);
  }

  async restoreRecord(id: string): Promise<FinancialRecord> {
    const record = await recordRepository.findDeletedById(id);
    if (!record) throw new NotFoundError('Deleted financial record');
    return recordRepository.restore(id);
  }
}

export const recordService = new RecordService();