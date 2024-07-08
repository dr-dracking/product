import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

import { PaginationDto, Role, User } from 'src/common';
import { NATS_SERVICE } from 'src/config';
import { hasRoles } from 'src/helpers';
import { CreateProductDto } from './dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(ProductService.name);

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database \\(^.^)/');
  }

  create(createProductDto: CreateProductDto, user: User) {
    return this.product.create({ data: { ...createProductDto, createdById: user.id } });
  }

  async findAll(paginationDto: PaginationDto, user: User) {
    const { page, limit } = paginationDto;
    const isAdmin = hasRoles(user.roles, [Role.Admin]);

    const where = isAdmin ? {} : { deletedAt: null };
    const total = await this.product.count({ where });
    const lastPage = Math.ceil(total / limit);

    const data = await this.product.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where,
    });

    return {
      meta: { total, page, lastPage },
      data,
    };
  }

  async findOne(id: number, user: User) {
    const product = await this.product.findUnique({
      where: { id },
    });

    if (!product)
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Product with id ${id} not found`,
      });

    if (!hasRoles(user.roles, [Role.Admin]) && product.deletedAt)
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Product with id ${id} not found`,
      });

    const { createdById, lastUpdatedById } = product;
    const [createdBy, lastUpdatedBy] = await Promise.all([
      firstValueFrom(this.client.send('users.find.id.summary', { id: createdById })),
      firstValueFrom(this.client.send('users.find.id.summary', { id: lastUpdatedById })),
    ]);

    return { ...product, createdBy, lastUpdatedBy };
  }

  async update(UpdateProductDto: UpdateProductDto, user: User) {
    const { id, ...data } = UpdateProductDto;

    const product = await this.findOne(id, user);

    if (product.deletedAt !== null)
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Product with id ${id}, already deleted`,
      });

    return this.product.update({ where: { id }, data: { ...data, lastUpdatedById: user.id } });
  }

  async remove(id: number, user: User) {
    const product = await this.findOne(id, user);

    if (product.deletedAt !== null)
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Product with id ${id}, already deleted`,
      });

    return this.product.update({ where: { id }, data: { deletedAt: new Date(), lastUpdatedById: user.id } });
  }

  async restore(id: number, user: User) {
    const product = await this.findOne(id, user);

    if (product.deletedAt === null)
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Product with id ${id}, already restored`,
      });

    return this.product.update({ where: { id }, data: { deletedAt: null, lastUpdatedById: user.id } });
  }
}
