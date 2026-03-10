export class SeoSitemapItemDto {
  id: string;
  updatedAt: Date;

  constructor(data: Partial<SeoSitemapItemDto>) {
    Object.assign(this, data);
  }
}

export class SeoSitemapUserDto {
  id: string;
  updatedAt: Date;
  showPlants: boolean;
  showShelves: boolean;
  plants: SeoSitemapItemDto[];
  shelves: SeoSitemapItemDto[];

  constructor(data: Partial<SeoSitemapUserDto>) {
    Object.assign(this, data);
  }
}
