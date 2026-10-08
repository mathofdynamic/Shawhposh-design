import { eq } from 'drizzle-orm';
import { catalogSeedProducts } from './catalogSeed';
import { db, sqlite } from './connection';
import { products, categories } from './schema';
import { saveCategory, saveProduct } from '../modules/catalog/service';

const categoryNames: Record<string, string> = {
  calligraphy: 'کالیگرافی',
  graphic: 'گرافیک',
  minimalist: 'مینیمال',
  pod: 'چاپ سفارشی',
};

try {
  for (const [displayOrder, slug] of [...new Set(catalogSeedProducts.map((product) => product.category))].entries()) {
    if (!db.select().from(categories).where(eq(categories.slug, slug)).get()) {
      saveCategory({ nameFa: categoryNames[slug] ?? slug, slug, displayOrder });
    }
  }

  for (const product of catalogSeedProducts) {
    const slug = product.id;
    if (db.select().from(products).where(eq(products.slug, slug)).get()) continue;
    saveProduct({
      name: product.name,
      slug,
      description: product.description,
      category: product.category,
      basePriceTomans: product.price,
      status: 'active',
      isCustomizable: false,
      featured: false,
      images: [],
      details: product.details,
      skuPrefix: product.id.toUpperCase(),
      variants: product.colors.flatMap((color, colorIndex) => product.sizes.map((size) => ({
        sku: `${product.id.toUpperCase()}-C${colorIndex + 1}-${size}`,
        colorName: color.name,
        colorHex: color.hex,
        size,
        priceTomans: null,
        minStockThreshold: 3,
        isEnabled: true,
        fit: 'oversize',
      }))),
    });
  }

  console.log({
    products: db.select().from(products).all().length,
    categories: db.select().from(categories).all().length,
    initialInventory: 'zero; inventory must be counted and entered by staff',
  });
} finally {
  sqlite.close();
}
