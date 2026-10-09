# Vastrix — Backend API Server

> **Production REST API for Physical Boutique Digitization & Traditional Clothing Marketplace**

Vastrix Backend powers the offline-first marketplace connecting customers with physical traditional clothing stores across India.

* **Base API Path**: `/api/v1`
* **Health Check**: `/api/health`

---

## ⚡ Architecture & Core Capabilities

### 1. Atomic Concurrency & Inventory Guarantees
Each traditional garment is an artisan piece tracked by four atomic counters:
* `totalQuantity`
* `availableQuantity`
* `reservedQuantity`
* `soldQuantity`

When a customer holds an item for store inspection:
1. An interactive transaction (`prisma.$transaction`) atomically checks availability.
2. If `availableQuantity < requestedQuantity`, it rolls back with `INSUFFICIENT_STOCK`.
3. `availableQuantity -= qty`, `reservedQuantity += qty`.
4. Generates an exclusive pickup code (*e.g. `TRAD-8F42K`*) with 48h expiration.
5. When customer purchases offline at the store: `reservedQuantity -= qty`, `soldQuantity += qty`.

### 2. Physical Shop & Indoor Floor Hierarchy
Physical store addresses are structured to navigate customers directly to the clothing rack inside shopping centers:
* `City` & `State`
* `Mall / Arcade` (*e.g. City Center Mall, Fancy Bazar Heritage Arcade, DLF Promenade*)
* `Floor Level` (*e.g. "2nd Floor - Ethnic & Bridal Wing"*)
* `Shop Number` (*e.g. "Shop 204"*)
* `Section` (*e.g. "Northeast Silk Pavilion"*)
* `Nearby Landmark` & `Indoor Walking Directions`

### 3. Google Gemini AI Virtual Try-On (`POST /api/v1/ai/try-on`)
* Integrates Google Gemini 2.5 Flash for multimodal visual appraisal.
* Evaluates customer portrait against the selected traditional ensemble:
  * Fit score calculation (`88% – 99%`)
  * Drape recommendation (Nivi vs Bengali vs Gujarati front drape)
  * Occasion appraisal (Wedding Reception, Bihu, Durga Puja, Diwali Gala)
  * Jewelry pairings (Polki diamond choker, temple jhumkas)

### 4. Authentication & Security
* **JWT Authentication**: Short-lived Access Tokens (7d) + Rotating Refresh Tokens (30d) with database revocation.
* **Google OAuth 2.0**: Exchange authorization codes via `google-auth-library` with automatic account creation.
* **Role-Based Access Control (RBAC)**: `CUSTOMER`, `SHOPKEEPER`, `ADMIN`.
* **CORS Protection**: Automatic trailing-slash normalization and whitelisting of trusted origins.

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| **Runtime** | Node.js (v20+ / v24) with ES Modules (`"type": "module"`) |
| **Framework** | Express.js |
| **Language** | TypeScript 5.8 (Target ES2022, `NodeNext` resolution) |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma ORM 6.4 with typed client |
| **AI Vision** | Google Gemini API (`gemini-2.5-flash`) |
| **Auth** | JSONWebToken, bcryptjs, google-auth-library |
| **Validation** | Zod schema validation middleware |

---

## ⚙️ Environment Variables

Create a `.env` file in the `server/` root:

```env
# Server
PORT=5001
NODE_ENV=development
CLIENT_URL=https://snap-drag.vercel.app
CORS_ORIGIN=https://snap-drag.vercel.app,http://localhost:5173

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/snapdragdb?sslmode=require

# JWT
JWT_ACCESS_SECRET=your_jwt_access_secret_256bit
JWT_REFRESH_SECRET=your_jwt_refresh_secret_256bit
JWT_ACCESS_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Geoapify (Map Coordinates)
GEOAPIFY_API_KEY=2a6102baa3dd46c984a663c73893d45f

# Cloudinary / Image Uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

---

## 📡 API Endpoint Reference

### System & Health
* `GET /api/health` — System status, database connection, and environment diagnostics

### Authentication (`/api/v1/auth`)
* `POST /auth/register` — Register new customer or shopkeeper
* `POST /auth/login` — Sign in with email & password
* `POST /auth/refresh` — Rotate refresh token & get new access token
* `POST /auth/logout` — Revoke refresh token
* `GET /auth/me` — Get current authenticated user profile
* `GET /auth/google/url` — Generate Google OAuth consent URL
* `POST /auth/google` — Exchange Google auth code for JWT tokens

### Categories & Locations (`/api/v1`)
* `GET /categories` — List all traditional clothing categories
* `GET /locations/cities` — Get verified cities with boutique counts

### Products (`/api/v1/products`)
* `GET /products` — Browse/search clothing with city, category, price, and color filters
* `GET /products/:id` — Detailed product view with shop location and floor hierarchy
* `POST /products` — Add product (Shopkeeper only)
* `PUT /products/:id` — Edit product details and in-store stock (Shopkeeper only)
* `DELETE /products/:id` — Delete product (Shopkeeper only)

### Physical Shops (`/api/v1/shops`)
* `GET /shops` — List traditional shops by city
* `GET /shops/:id` — Get boutique profile, mall location, and current stock

### In-Store Holds / Reservations (`/api/v1/reservations`)
* `POST /reservations` — Reserve a product for 48h free store visit hold
* `GET /reservations/my` — Customer: View active and past in-store hold passes
* `GET /reservations/shop` — Shopkeeper: View incoming reservation holds
* `PATCH /reservations/:id/status` — Update hold status (`CONFIRMED`, `COMPLETED`, `CANCELLED`)

### Customer Favorites (`/api/v1/favorites`)
* `GET /favorites` — Get customer's saved clothing items
* `POST /favorites/toggle/:productId` — Save or unsave an outfit

### AI Virtual Mirror (`/api/v1/ai`)
* `POST /ai/try-on` — Multimodal virtual mirror drape appraisal with Google Gemini

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client & Sync Database
```bash
npx prisma db push
```

### 3. Seed Boutique & Product Catalog
```bash
npx tsx prisma/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
# Running on http://localhost:5001
```

### 5. Run Test Suite
```bash
# Concurrency stress test (10 simultaneous holds on single-item stock)
npm run test:concurrency

# Full End-to-End user journey test
npm run test:e2e
```

---

## 🚢 Deploying to Render

1. Connect the backend repository to a **Web Service** on [Render](https://render.com).
2. Configure service settings:
   * **Root Directory**: Leave blank (or `./`)
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start` *(automatically pushes Prisma schema and seeds on boot)*
3. Add environment variables in the Render Dashboard:
   * `DATABASE_URL` (Internal or External PostgreSQL URL)
   * `JWT_ACCESS_SECRET`
   * `JWT_REFRESH_SECRET`
   * `GEMINI_API_KEY`
   * `CLIENT_URL` (e.g. `https://snap-drag.vercel.app`)

---

## 🔑 Pre-Seeded Test Credentials

| Role | Email | Password | Details |
|---|---|---|---|
| **Customer** | `ananya.sharma@example.com` | `Customer@123456` | Can browse, try in mirror, and hold items |
| **Shopkeeper** | `kamakhya.handloom@vastrix.local` | `Password@123456` | Owner of Maa Kamakhya Traditional Handlooms (Guwahati) |
| **Administrator** | `admin@vastrix.local` | `Admin@123456` | Full platform governance & metrics access |
