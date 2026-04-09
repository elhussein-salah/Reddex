# AGENTS Guide for `reddex`

## Project Snapshot
- Stack: NestJS 11 + Prisma 7 + PostgreSQL + TypeScript (`src/`, `prisma/`, `docker-compose.yml`).
- Entrypoint is `src/main.ts`; Swagger is mounted at `/api`.
- Root module `src/app.module.ts` wires `PrismaModule`, `UserModule`, `DoctorModule`, and a global exception filter.

## Architecture and Boundaries
- Current domain shape is module-per-feature under `src/` (`user/`, `doctor/`, `prisma/`, `common/`).
- Real CRUD flow is implemented in `user` only:
  - HTTP routes: `src/user/user.controller.ts`
  - Business logic + hashing: `src/user/user.service.ts`
  - DTO contracts: `src/user/dto/*.ts`
- `doctor` is scaffolded but not production-ready (`src/doctor/*` contains copy/paste drift, see "Known Codebase State").
- Shared infrastructure:
  - DB access via `PrismaService` (`src/prisma/prisma.service.ts`)
  - Error normalization via `GlobalExceptionFilter` (`src/common/filters/http-exception.filter.ts`)

## Data Layer and Prisma Conventions
- Prisma schema is `prisma/schema.prisma`; generated client output is committed to `src/generated/prisma`.
- Use `users` delegate (`this.prisma.users`) as in `src/user/user.service.ts`.
- `Role` enum comes from generated Prisma enums (`src/generated/prisma/enums.ts` import path usage in DTOs).
- Do not edit generated files under `src/generated/prisma/**`; regenerate instead.
- `PrismaService` uses `@prisma/adapter-pg` with `DATABASE_URL` from env.

## API and Service Patterns (use these when adding features)
- Controller pattern: thin controllers, pass DTOs directly to service (`src/user/user.controller.ts`).
- Service pattern: protect sensitive fields with `select` constants (`USER_SELECT` in `src/user/user.service.ts`).
- Passwords are always hashed with `argon2` before persistence (`create` and `update`).
- Mutation methods return a small `SuccessResponse` object (`src/common/interfaces/success.response.ts`).
- Exceptions are thrown from services (`NotFoundException`, `ConflictException`), with Prisma codes mapped globally.

## Developer Workflows
- Install deps: `npm install`
- Start API in watch mode: `npm run start:dev`
- Build: `npm run build`
- Unit tests: `npm run test`; e2e: `npm run test:e2e`
- Lint + autofix: `npm run lint`
- Local DB: `docker compose up -d db` (Postgres exposed on `localhost:5433`)
- Prisma config is centralized in `prisma.config.ts`; env values are in `.env`.

## Known Codebase State (important for agent decisions)
- `README.md` is the default Nest template; rely on code/config files for real behavior.
- `src/doctor/doctor.service.ts` currently exports `UserService` and calls `this.prisma.user` (singular), which does not match existing `users` delegate usage.
- `src/doctor/doctor.controller.ts` currently exposes no endpoints.
- No global `ValidationPipe` is registered in `src/main.ts`; class-validator decorators exist on DTOs but are not globally enforced yet.
- Cloudinary/multer deps and env vars exist in `package.json`/`.env` but are not yet wired in `src/`.

