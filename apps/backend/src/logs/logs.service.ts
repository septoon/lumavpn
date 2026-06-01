import { Injectable } from '@nestjs/common';
import { LogType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  create(type: LogType, payload: Prisma.InputJsonValue) {
    return this.prisma.log.create({ data: { type, payload } });
  }

  list(take = 100) {
    return this.prisma.log.findMany({ orderBy: { createdAt: 'desc' }, take });
  }
}
