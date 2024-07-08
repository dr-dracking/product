import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto, User } from 'src/common';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @MessagePattern('product.create')
  create(@Payload() payload: { createProductDto: CreateProductDto; user: User }) {
    const { createProductDto, user } = payload;
    return this.productService.create(createProductDto, user);
  }

  @MessagePattern('product.findAll')
  findAll(@Payload() payload: { paginationDto: PaginationDto; user: User }) {
    const { paginationDto, user } = payload;
    return this.productService.findAll(paginationDto, user);
  }

  @MessagePattern('product.findOne')
  findOne(@Payload() payload: { id: number; user: User }) {
    const { id, user } = payload;
    return this.productService.findOne(id, user);
  }

  @MessagePattern('product.update')
  update(@Payload() payload: { updateProductDto: UpdateProductDto; user: User }) {
    const { updateProductDto, user } = payload;
    return this.productService.update(updateProductDto, user);
  }

  @MessagePattern('product.remove')
  remove(@Payload() payload: { id: number; user: User }) {
    const { id, user } = payload;
    return this.productService.remove(id, user);
  }

  @MessagePattern('product.restore')
  restore(@Payload() payload: { id: number; user: User }) {
    const { id, user } = payload;
    return this.productService.restore(id, user);
  }
}
