import { db, sqlite } from './connection';
import { eq } from 'drizzle-orm';
import { categories, products } from './schema';
import { saveCategory } from '../modules/catalog/service';

const garmentCategories = [
  { slug: 'tshirt', nameFa: 'تیشرت', nameEn: 'T-shirt', displayOrder: 0 },
  { slug: 'hoodie', nameFa: 'هودی', nameEn: 'Hoodie', displayOrder: 1 },
  { slug: 'dors', nameFa: 'دورس', nameEn: 'Crewneck sweatshirt', displayOrder: 2 },
  { slug: 'sweatshirt', nameFa: 'سویشرت', nameEn: 'Sweatshirt', displayOrder: 3 },
  { slug: 'halfzip', nameFa: 'نیم‌زیپ', nameEn: 'Half zip', displayOrder: 4 },
  { slug: 'pants', nameFa: 'شلوار', nameEn: 'Pants', displayOrder: 5 },
] as const;

try {
  for (const category of garmentCategories) {
    if (!db.select().from(categories).where(eq(categories.slug, category.slug)).get()) {
      saveCategory(category);
    }
  }

  console.log({
    products: db.select().from(products).all().length,
    categories: db.select().from(categories).all().length,
    catalog: 'owner-managed; no sample products are seeded',
  });
} finally {
  sqlite.close();
}
