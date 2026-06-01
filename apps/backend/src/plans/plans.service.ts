import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlanDto, UpdatePlanDto } from './dto';
import { PlansRepository } from './plans.repository';

@Injectable()
export class PlansService {
  constructor(private readonly plans: PlansRepository) {}

  publicPlans() {
    return this.plans.active();
  }

  adminPlans() {
    return this.plans.all();
  }

  async getActiveByCode(code: string) {
    const plan = await this.plans.findByCode(code);
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');
    return plan;
  }

  create(dto: CreatePlanDto) {
    return this.plans.create(dto);
  }

  update(id: string, dto: UpdatePlanDto) {
    return this.plans.update(id, dto);
  }
}
