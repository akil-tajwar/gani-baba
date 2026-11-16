# Gani Baba — Storefront & Admin Dashboard (Next.js)

Sanitary ware store: commodes, basins, taps, showers, geysers, pumps and pipe
fittings. Customer storefront (brands, categories, special offers, cart,
checkout) plus an admin dashboard (categories & brands, products, orders).

## Run

```bash
npm install
cp .env.example .env.local     # set NEXT_PUBLIC_API_BASE_URL
npm run dev
```

> The old `node init` step is gone — `dev`, `build` and `start` now run plain
> `next dev | build | start`.

## Change the colors (one place)

Open **`app/globals.css`** and edit just these two lines:

```css
:root {
  --primary-color: #1d4ed8;   /* buttons, links, prices, highlights */
  --secondary-color: #0b1f3a; /* top strip, footer, dashboard sidebar */
}
```

Every shade (`bg-primary-50 … bg-primary-900`, hover states, borders, the
dashboard sidebar, the hero slider) is derived from those two values in
`tailwind.config.ts`. Use them in code as `bg-primary`, `text-primary`,
`bg-secondary`, `border-primary-200`, etc.

## Change contact details / payment numbers (one place)

`utils/constants.ts` → **`siteConfig`** (name, phone, WhatsApp, email, address,
social links, bKash / Nagad / Rocket numbers, advance amount). All values
marked `TODO` are placeholders.

## Files you must add to `/public`

| File | Used for |
|---|---|
| `QRbkash.jpeg`, `nagadQR.jpg`, `QRrocket.jpeg` | payment QR codes (checkout) |
| `bkash.png`, `nagad.webp`, `rocket.jpg` | payment method logos (checkout) |
| `favicon.ico`, `apple-touch-icon.png` | browser icons (optional) |
| `placeholder.svg` | **included** — fallback product image |

The header/footer logo is a text wordmark built from `siteConfig.name`. To use
an image logo instead, replace the wordmark in `components/shared/navbar.tsx`
and `footer.tsx` with `<Image src="/logo.png" … />`.

## Routes

| Route | Page |
|---|---|
| `/` | Home: hero, categories, offers, top brands, products by category |
| `/category-products/[subCategoryId]` | One category (the param holds the **categoryId**) with brand/price filters |
| `/men-products` | **All Products** — filters: category, brand, price. `?brand=ID`, `?category=ID` preselect |
| `/kids-products` | **All Brands** grid → links to `/men-products?brand=ID` |
| `/flash-sale-products` | **Special Offers** (every product with a discount) |
| `/product-details/[id]` | Product page |
| `/checkout`, `/thank-you`, `/profile` | Customer flow |
| `/dashboard/categories` | Categories **and** Brands (tabs) |
| `/dashboard/products`, `/orders-to-confirm`, `/confirmed-orders` | Admin |

The folder names `men-products`, `kids-products` and `flash-sale-products` are
kept from the original file structure; they only appear in URLs.

## API contract this frontend expects

Same `/api/...` shape as the original backend, with these data shapes:

- `GET api/categories/get` → `[{ categoryId, name }]` (create/update/delete as before)
- `GET api/brands/get` → `[{ brandId, name }]` plus `POST create`, `PUT update/:id`, `DELETE delete/:id`
- `GET api/products/get` and `/get/:id` → flat objects:
  `{ productId, productCode, name, description, price, discount, photoUrl, isAvailable, categoryId, categoryName, brandId, brandName, createdAt }`
- `POST api/products/create`, `PUT api/products/update/:id` → multipart form:
  field `product` (JSON string: name, productCode, description, price, discount, categoryId, brandId, isAvailable) and **one** file field **`photoFile`**
- `POST api/orders/create` → `{ orderMaster, orderDetails }` where
  `method` is `bkash | nagad | rocket | cod`. For `cod` the frontend sends
  `transactionId: ''` and `billingPhone` = the customer phone.
  `orderDetails[]` = `{ productId, quantity, amount }` (no size).
- `GET api/orders/getAll` / `getByUserId/:id` → `{ orderMaster: { ordersMasterId, … }, orderDetails: [...] }`
