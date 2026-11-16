import { db } from "../config/database";
import { brandsModel, NewBrand } from "../schemas";
import { eq } from "drizzle-orm";

export const createBrand = async (data: NewBrand) => {
  const [newBrand] = await db
    .insert(brandsModel)
    .values(data)
    .returning();
  return newBrand;
};

export const getCategories = async () => {
  return await db.select().from(brandsModel);
};

export const getBrandById = async (id: number) => {
  return await db.query.brandsModel.findFirst({
    where: eq(brandsModel.brandId, id),
    with: { products: true },
  });
};

export const updateBrand = async (
  id: number,
  data: Partial<NewBrand>
) => {
  const [updated] = await db
    .update(brandsModel)
    .set(data)
    .where(eq(brandsModel.brandId, id))
    .returning();

  if (!updated) return undefined;

  return getBrandById(id);
};

export const deleteBrand = async (id: number) => {
  const deleted = await db
    .delete(brandsModel)
    .where(eq(brandsModel.brandId, id))
    .returning({ brandId: brandsModel.brandId });

  return { success: deleted.length > 0 };
};