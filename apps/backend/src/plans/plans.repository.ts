import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  active() {
    return this.prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceRub: 'asc' } });
  }

  all() {
    return this.prisma.plan.findMany({ orderBy: { priceRub: 'asc' } });
  }

  findByCode(code: string) {
    return this.prisma.plan.findUnique({ where: { code } });
  }

  create(data: Prisma.PlanCreateInput) {
    return this.prisma.plan.create({ data });
  }

  update(id: string, data: Prisma.PlanUpdateInput) {
    return this.prisma.plan.update({ where: { id }, data });
  }
}
