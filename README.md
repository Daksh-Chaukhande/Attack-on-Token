# SharePlate - Food Rescue & Community Redistribution Platform

SharePlate connects surplus food donors (restaurants, bakeries, grocery stores, individuals) with community members, shelters, and food banks. The platform minimizes food waste while addressing food insecurity with a safe, verified pickup process.

---

## 🌟 Key Features

- **Surplus Food Listings**: Donors can publish available food items with quantity, dietary/allergen tags, expiry countdowns, storage guidelines, and pickup windows.
- **Real-Time Discovery & Filtering**: Search and filter listings by food category, dietary preferences (Vegan, Vegetarian, Halal, Kosher, Gluten-Free), distance, and urgency.
- **Claim & Reservation System**: Recipients can reserve portions or whole batches within allowed pickup windows.
- **Secure Pickup Verification**: Verification mechanism via QR code and 6-digit confirmation codes to ensure items are collected by the designated claimant.
- **Food Safety Compliance**: Built-in food safety checklists and guidelines for temperature control, allergen warnings, and packaging.
- **Notification Engine**: In-app notifications for claim confirmations, pickup reminders, and listing expirations.
- **Admin & Moderation Dashboard**: Oversight for listings, users, audit logs, and compliance.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Vue 3](https://vuejs.org/) (Composition API)
- **Language**: TypeScript
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Routing**: [Vue Router](https://router.vuejs.org/)
- **Icons & QR**: Lucide Icons & QRCode

### Backend
- **Runtime**: Node.js
- **Framework**: [Express](https://expressjs.com/)
- **Language**: TypeScript
- **Database ORM**: [Prisma ORM](https://www.prisma.io/)
- **Database**: MySQL 8
- **Authentication**: JWT & Refresh Token rotation
- **Testing**: Vitest / Jest-compatible test suite

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- MySQL 8.x running locally or via Docker

### 1. Installation
Clone the repository and install dependencies:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration
Copy the backend `.env.example` file and configure your credentials:

```bash
cd backend
cp .env.example .env
```

Update your `.env` with your database credentials:
```env
DATABASE_URL="mysql://<user>:<password>@localhost:3306/shareplate"
JWT_SECRET="your_jwt_secret"
REFRESH_TOKEN_SECRET="your_refresh_secret"
```

### 3. Database Setup & Seeding
Run Prisma migrations and seed sample data:

```bash
cd backend
npm run db:push
npm run db:seed
```

### 4. Running the Application

Run both backend and frontend from the root workspace or in separate terminals:

```bash
# Terminal 1 - Backend (http://localhost:4000)
cd backend
npm run dev

# Terminal 2 - Frontend (http://localhost:5173)
cd frontend
npm run dev
```

Or from the root directory:
```bash
npm run dev:backend
npm run dev:frontend
```

---

## 🧪 Testing

```bash
# Backend unit & integration tests
npm --prefix backend run test

# Frontend tests
npm --prefix frontend run test
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
