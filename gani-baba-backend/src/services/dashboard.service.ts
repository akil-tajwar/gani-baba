import { db } from "../config/database";
import {
  brandsModel,
  categoriesModel,
  ordersDetailsModel,
  ordersMasterModel,
  productsModel,
  userModel,
} from "../schemas";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

// ---------------------------------------------------------------------
// Range handling:  7D | 15D | 1M | 3M | 6M | 1Y   (D = days, M = months, Y = years)
// ---------------------------------------------------------------------
export const DASHBOARD_RANGES = ["7D", "15D", "1M", "3M", "6M", "1Y"] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

type Bucket = "day" | "week" | "month";

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Returns the period [from, to], the previous period of the same length, and the chart bucket size. */
export const resolveRange = (range: DashboardRange) => {
  const to = new Date();
  const from = new Date(to);

  switch (range) {
    case "7D":
      from.setDate(from.getDate() - 6); // today + previous 6 days
      break;
    case "15D":
      from.setDate(from.getDate() - 14);
      break;
    case "1M":
      from.setMonth(from.getMonth() - 1);
      break;
    case "3M":
      from.setMonth(from.getMonth() - 3);
      break;
    case "6M":
      from.setMonth(from.getMonth() - 6);
      break;
    case "1Y":
      from.setFullYear(from.getFullYear() - 1);
      break;
  }

  const start = startOfDay(from);
  const duration = to.getTime() - start.getTime();
  const prevFrom = new Date(start.getTime() - duration);
  const prevTo = new Date(start.getTime() - 1);

  // daily points for short ranges, weekly for 3M/6M, monthly for 1Y
  const bucket: Bucket =
    range === "1Y"
      ? "month"
      : range === "3M" || range === "6M"
        ? "week"
        : "day";

  return { from: start, to, prevFrom, prevTo, bucket };
};

// Orders that count as real sales (pending orders are not revenue yet)
const SOLD_STATUSES = sql`('confirmed','delivered')`;

const inPeriod = (from: Date, to: Date) =>
  and(
    gte(ordersMasterModel.createdAt, from),
    lte(ordersMasterModel.createdAt, to),
  );

// ---------------------------------------------------------------------
// Period totals (used for the current AND the previous period)
// ---------------------------------------------------------------------
const getPeriodStats = async (from: Date, to: Date) => {
  const [orders] = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      pendingOrders: sql<number>`(count(*) filter (where ${ordersMasterModel.status} = 'pending'))::int`,
      confirmedOrders: sql<number>`(count(*) filter (where ${ordersMasterModel.status} = 'confirmed'))::int`,
      deliveredOrders: sql<number>`(count(*) filter (where ${ordersMasterModel.status} = 'delivered'))::int`,
      soldOrders: sql<number>`(count(*) filter (where ${ordersMasterModel.status} in ${SOLD_STATUSES}))::int`,
      revenue: sql<number>`coalesce(sum(${ordersMasterModel.totalAmount}) filter (where ${ordersMasterModel.status} in ${SOLD_STATUSES}), 0)::int`,
      pendingValue: sql<number>`coalesce(sum(${ordersMasterModel.totalAmount}) filter (where ${ordersMasterModel.status} = 'pending'), 0)::int`,
    })
    .from(ordersMasterModel)
    .where(inPeriod(from, to));

  const [items] = await db
    .select({
      itemsSold: sql<number>`coalesce(sum(${ordersDetailsModel.quantity}), 0)::int`,
    })
    .from(ordersDetailsModel)
    .innerJoin(
      ordersMasterModel,
      eq(ordersDetailsModel.ordersMasterId, ordersMasterModel.ordersMasterId),
    )
    .where(
      and(
        inPeriod(from, to),
        sql`${ordersMasterModel.status} in ${SOLD_STATUSES}`,
      ),
    );

  // New customers = users registered in the period (role 1 = admin is excluded)
  const [customers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userModel)
    .where(
      and(
        gte(userModel.createdAt, from),
        lte(userModel.createdAt, to),
        sql`${userModel.roleId} is distinct from 1`,
      ),
    );

  const averageOrderValue = orders.soldOrders
    ? Math.round(orders.revenue / orders.soldOrders)
    : 0;

  return {
    revenue: orders.revenue,
    totalOrders: orders.totalOrders,
    soldOrders: orders.soldOrders,
    pendingOrders: orders.pendingOrders,
    confirmedOrders: orders.confirmedOrders,
    deliveredOrders: orders.deliveredOrders,
    pendingValue: orders.pendingValue,
    itemsSold: items.itemsSold,
    averageOrderValue,
    newCustomers: customers.count,
  };
};

// ---------------------------------------------------------------------
// Ranked lists (top products / categories / brands) share the same joins
// ---------------------------------------------------------------------
const soldItemsInPeriod = (from: Date, to: Date) =>
  and(inPeriod(from, to), sql`${ordersMasterModel.status} in ${SOLD_STATUSES}`);

// ---------------------------------------------------------------------
// Main overview
// ---------------------------------------------------------------------
export const getDashboardOverview = async (range: DashboardRange) => {
  const { from, to, prevFrom, prevTo, bucket } = resolveRange(range);

  const step =
    bucket === "day" ? "1 day" : bucket === "week" ? "1 week" : "1 month";

  const [
    current,
    previous,
    trend,
    statusRows,
    paymentRows,
    topProducts,
    topCategories,
    topBrands,
    recentOrders,
    catalog,
  ] = await Promise.all([
    getPeriodStats(from, to),
    getPeriodStats(prevFrom, prevTo),

    // Sales trend: one row per bucket, empty buckets filled with 0
    db.execute(sql`
      SELECT
        to_char(b.bucket, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status IN ('confirmed','delivered')), 0)::int AS revenue,
        COUNT(o.orders_master_id)::int AS orders
      FROM generate_series(
        date_trunc(${bucket}, ${from}::timestamp),
        date_trunc(${bucket}, ${to}::timestamp),
        ${step}::interval
      ) AS b(bucket)
      LEFT JOIN orders_master o
        ON date_trunc(${bucket}, o.created_at) = b.bucket
       AND o.created_at >= ${from}::timestamp
       AND o.created_at <= ${to}::timestamp
      GROUP BY b.bucket
      ORDER BY b.bucket
    `),

    // Orders by status
    db
      .select({
        status: ordersMasterModel.status,
        count: sql<number>`count(*)::int`,
      })
      .from(ordersMasterModel)
      .where(inPeriod(from, to))
      .groupBy(ordersMasterModel.status),

    // Payment methods
    db
      .select({
        method: ordersMasterModel.method,
        count: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${ordersMasterModel.totalAmount}), 0)::int`,
      })
      .from(ordersMasterModel)
      .where(inPeriod(from, to))
      .groupBy(ordersMasterModel.method),

    // Top products (by revenue)
    db
      .select({
        productId: productsModel.productId,
        name: productsModel.name,
        photoUrl: productsModel.photoUrl,
        brandName: brandsModel.name,
        quantity: sql<number>`sum(${ordersDetailsModel.quantity})::int`,
        revenue: sql<number>`sum(${ordersDetailsModel.amount})::int`,
      })
      .from(ordersDetailsModel)
      .innerJoin(
        ordersMasterModel,
        eq(ordersDetailsModel.ordersMasterId, ordersMasterModel.ordersMasterId),
      )
      .innerJoin(
        productsModel,
        eq(ordersDetailsModel.productId, productsModel.productId),
      )
      .innerJoin(brandsModel, eq(productsModel.brandId, brandsModel.brandId))
      .where(soldItemsInPeriod(from, to))
      .groupBy(
        productsModel.productId,
        productsModel.name,
        productsModel.photoUrl,
        brandsModel.name,
      )
      .orderBy(desc(sql`sum(${ordersDetailsModel.amount})`))
      .limit(5),

    // Top categories
    db
      .select({
        categoryId: categoriesModel.categoryId,
        name: categoriesModel.name,
        quantity: sql<number>`sum(${ordersDetailsModel.quantity})::int`,
        revenue: sql<number>`sum(${ordersDetailsModel.amount})::int`,
      })
      .from(ordersDetailsModel)
      .innerJoin(
        ordersMasterModel,
        eq(ordersDetailsModel.ordersMasterId, ordersMasterModel.ordersMasterId),
      )
      .innerJoin(
        productsModel,
        eq(ordersDetailsModel.productId, productsModel.productId),
      )
      .innerJoin(
        categoriesModel,
        eq(productsModel.categoryId, categoriesModel.categoryId),
      )
      .where(soldItemsInPeriod(from, to))
      .groupBy(categoriesModel.categoryId, categoriesModel.name)
      .orderBy(desc(sql`sum(${ordersDetailsModel.amount})`))
      .limit(6),

    // Top brands
    db
      .select({
        brandId: brandsModel.brandId,
        name: brandsModel.name,
        quantity: sql<number>`sum(${ordersDetailsModel.quantity})::int`,
        revenue: sql<number>`sum(${ordersDetailsModel.amount})::int`,
      })
      .from(ordersDetailsModel)
      .innerJoin(
        ordersMasterModel,
        eq(ordersDetailsModel.ordersMasterId, ordersMasterModel.ordersMasterId),
      )
      .innerJoin(
        productsModel,
        eq(ordersDetailsModel.productId, productsModel.productId),
      )
      .innerJoin(brandsModel, eq(productsModel.brandId, brandsModel.brandId))
      .where(soldItemsInPeriod(from, to))
      .groupBy(brandsModel.brandId, brandsModel.name)
      .orderBy(desc(sql`sum(${ordersDetailsModel.amount})`))
      .limit(6),

    // Latest orders in the period
    db
      .select({
        ordersMasterId: ordersMasterModel.ordersMasterId,
        fullName: ordersMasterModel.fullName,
        totalAmount: ordersMasterModel.totalAmount,
        status: ordersMasterModel.status,
        method: ordersMasterModel.method,
        createdAt: ordersMasterModel.createdAt,
      })
      .from(ordersMasterModel)
      .where(inPeriod(from, to))
      .orderBy(desc(ordersMasterModel.createdAt))
      .limit(8),

    // Catalog snapshot (not period based)
    Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(productsModel),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(productsModel)
        .where(eq(productsModel.isAvailable, false)),
      db.select({ count: sql<number>`count(*)::int` }).from(categoriesModel),
      db.select({ count: sql<number>`count(*)::int` }).from(brandsModel),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(userModel)
        .where(sql`${userModel.roleId} is distinct from 1`),
    ]),
  ]);

  const [products, unavailable, categories, brands, customers] = catalog;

  return {
    range,
    from,
    to,
    bucket,
    summary: { current, previous },
    catalog: {
      products: products[0].count,
      unavailableProducts: unavailable[0].count,
      categories: categories[0].count,
      brands: brands[0].count,
      customers: customers[0].count,
    },
    salesTrend: trend.rows as {
      date: string;
      revenue: number;
      orders: number;
    }[],
    ordersByStatus: statusRows,
    paymentMethods: paymentRows,
    topProducts,
    topCategories,
    topBrands,
    recentOrders,
  };
};
