import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaClient, Product } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

import { PaginationDto, Role, User } from 'src/common';
import { NATS_SERVICE } from 'src/config';
import { hasRoles, ObjectManipulator } from 'src/helpers';
import { CreateProductDto, UpdateProductDto } from './dto';

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

    const products = await this.product.findMany({ take: limit, skip: (page - 1) * limit, where });

    // Extract all unique createdById and lastUpdatedById values
    const userIds = new Set<string>();
    products.forEach((product) => {
      if (product.createdById) userIds.add(product.createdById);
      if (product.lastUpdatedById) userIds.add(product.lastUpdatedById);
    });

    // Fetch user data for all unique IDs
    const userRequests = Array.from(userIds).map((id) => firstValueFrom(this.client.send('users.find.summary', { id })));
    const users = await Promise.all(userRequests);
    const userMap = new Map(users.map((user) => [user.id, user]));

    // Map user data to products
    const data = products.map((product) => ({
      ...product,
      createdBy: userMap.get(product.createdById) || null,
      lastUpdatedBy: userMap.get(product.lastUpdatedById) || null,
    }));

    return { meta: { total, page, lastPage }, data };
  }

  async findOne(id: number, user: User) {
    const product = await this.product.findUnique({ where: { id } });

    if (!product) throw new RpcException({ status: HttpStatus.NOT_FOUND, message: `Product with id ${id} not found` });

    if (!hasRoles(user.roles, [Role.Admin]) && product.deletedAt)
      throw new RpcException({ status: HttpStatus.NOT_FOUND, message: `Product with id ${id} not found` });

    const { createdById, lastUpdatedById } = product;
    ObjectManipulator.removeKeys(product, ['createdById', 'lastUpdatedById']);

    const createdBy = await firstValueFrom(this.client.send('users.find.summary', { id: createdById }));

    let lastUpdatedBy = null;

    if (lastUpdatedById) lastUpdatedBy = await firstValueFrom(this.client.send('users.find.summary', { id: lastUpdatedById }));

    return { ...product, createdBy, lastUpdatedBy };
  }

  async update(updateProductDto: UpdateProductDto, user: User) {
    const { id, ...data } = updateProductDto;
    await this.ensureProductExists(id, user);
    return this.updateProductData(id, { ...data }, user);
  }

  async remove(id: number, user: User) {
    await this.ensureProductExists(id, user);
    return this.updateProductData(id, { deletedAt: new Date(), lastUpdatedById: user.id }, user);
  }

  async restore(id: number, user: User) {
    await this.ensureProductExists(id, user);
    return this.updateProductData(id, { deletedAt: null, lastUpdatedById: user.id }, user);
  }

  private async ensureProductExists(id: number, user: User) {
    return await this.findOne(id, user);
  }

  private async updateProductData(id: number, data: Partial<UpdateProductDto | Product>, user: User) {
    await this.product.update({ where: { id }, data });
    return this.findOne(id, user);
  }
}
