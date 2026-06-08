# Reddex API

Reddex is a comprehensive backend application designed for healthcare and medical platform management. Built with NestJS, it serves as a robust API to seamlessly manage patients, doctors, laboratories, prescriptions, and follow-ups. The project utilizes Prisma ORM with PostgreSQL for data persistence and integrates third-party services like Cloudinary for secure file management and SMTP for reliable email communication.

## Technology Stack

- **Framework:** NestJS 11
- **Language:** TypeScript
- **ORM:** Prisma 7
- **Database:** PostgreSQL
- **Authentication:** Custom JWT Implementation
- **Validation:** class-validator, class-transformer
- **Storage:** Cloudinary (File Uploads)
- **Email:** Nodemailer (@nestjs-modules/mailer)
- **API Documentation:** Swagger

## Project Architecture

The codebase adheres to a modular architecture, keeping concerns separated and maintaining high scalability:

- `src/user/`: Core identity and account management.
- `src/patients/`: Patient profiles and health status management.
- `src/doctor/`: Doctor profiles, clinics, and professional credentials.
- `src/labs/`: Laboratory records management.
- `src/follow-up/`: Doctor-patient follow-up request lifecycle (Pending, Accepted, Rejected, Cancelled).
- `src/prescriptions/`: Medication and prescription management linked to active follow-ups.
- `src/auth/`: General authentication, OTP management, and password resets.
- `src/admin-auth/`: Admin-specific authentication logic.
- `src/cloudinary/`: Cloudinary integration for centralized image/file uploads.
- `src/mail/`: Email service implementation.
- `src/prisma/`: Database connection and Prisma service instance.
- `src/common/`: Shared resources, including filters, interceptors, middleware, and utilities.

## Core Features and Data Model

- **Identity Management:** A central `users` model acts as the root for all roles (Admin, Doctor, Patient). Patients and doctors are linked 1:1 to their respective user records.
- **Authentication and Authorization:** Secured via JWT Bearer tokens and Role-Based Access Control (RBAC).
- **Follow-up System:** Manages dynamic requests between doctors and patients.
- **Prescription System:** Allows doctors to issue prescriptions for patients under active follow-ups.
- **Global Error Handling:** Standardized error responses mapped from Prisma exceptions to HTTP statuses via a `GlobalExceptionFilter`.
- **Response Formatting:** Consistent success responses wrapped via `TransformInterceptor`.

## Prerequisites

- Node.js (v18 or higher recommended)
- PostgreSQL
- Docker and Docker Compose (for local database setup)
- Cloudinary Account
- SMTP Configuration

## Setup and Installation

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Copy the example environment file and populate it with your credentials.
   ```bash
   cp .env.example .env
   ```
   *Key variables include `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_*`, and `MAIL_*`.*

3. **Database Setup:**
   Launch the local PostgreSQL database instance using Docker Compose:
   ```bash
   docker compose up -d db
   ```

4. **Prisma Client and Migrations:**
   Generate the Prisma client, apply migrations, and seed the database:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npm run seed
   ```

## Available Scripts

- `npm run start:dev` - Run the API in development (watch) mode.
- `npm run start:prod` - Run the API in production mode.
- `npm run build` - Compile the project to the `dist` directory.
- `npm run lint` - Run ESLint to identify and fix issues.
- `npm run format` - Format the codebase using Prettier.
- `npm run test` - Execute unit tests.
- `npm run test:e2e` - Execute end-to-end tests.

## API Documentation

The API endpoints are fully documented using Swagger. Once the application is running, the documentation interface can be accessed at:

```text
http://localhost:<PORT>/api
```

## Security Measures

- **Helmet:** Protects against common web vulnerabilities by setting appropriate HTTP headers.
- **CORS:** Configured in `main.ts` to restrict unauthorized origin access.
- **Rate Limiting:** Enforced via `ThrottlerGuard` to prevent abuse.
- **Password Hashing:** Passwords and OTPs are securely hashed using `argon2` before persistence.

## Deployment Workflows

The application is configured for continuous deployment via GitHub Actions. Pushes to the `main` branch trigger an automated workflow that runs tests, builds the application, and deploys it to an EC2 instance.
