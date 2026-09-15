# CLAUDE.md — BistroMapa

## 1. Project Overview

BistroMapa is a web application for discovering and managing information about restaurants. The platform has two main user groups: regular users looking for restaurants and restaurant owners who manage their restaurant profiles and subscriptions. Users can browse restaurants, save them, leave ratings and comments, and report incorrect information. Restaurant owners can manage their restaurants, while the platform handles restaurant visibility, subscriptions, promotions, reviews, reports, and related administrative operations.

**Project goal:** provide a simple platform for users to discover restaurants and for restaurant owners to maintain their presence and visibility on the platform.

---

## 2. Current Project Stage

- **Stage:** Existing product under active development.
- This is NOT a greenfield project.
- Prefer extending and improving existing architecture over rewriting working parts.
- Before changing existing logic, inspect how the current implementation works.
- Do not introduce architectural changes unless they solve a real problem.
- Preserve existing behavior unless the task explicitly requires changing it.

---

## 3. Team & Development Context

- **Team:** Solo developer.
- The project is developed and maintained primarily by one developer.
- Code should therefore prioritize:
  - maintainability
  - simplicity
  - clear structure
  - practical implementation
  - reasonable production safety
- Avoid unnecessary enterprise abstractions.
- Do not over-engineer simple functionality.

### Locked Decisions

- Frontend: React + Tailwind CSS.
- Backend: Node.js + Express.
- Database: PostgreSQL.
- ORM: Prisma.
- Redis is used for caching.
- Stripe is used for recurring subscriptions.
- The application is intended to be publicly available.
- **[ADD OTHER LOCKED DECISIONS]**

---

## 4. Communication Style

Claude should:

- Be direct and practical.
- Avoid corporate language and unnecessary explanations.
- Explain important architectural decisions briefly.
- Prefer taking a first reasonable pass instead of asking unnecessary questions.
- Ask before making a change when requirements are genuinely ambiguous or could affect existing business logic.
- If the task is straightforward, implement it directly.
- If there are multiple valid approaches, recommend one and briefly explain why.

Do not spend large amounts of text explaining obvious code.

---

## 5. Code Style

- Language: TypeScript.
- Use tabs for indentation.
- Prefer `async/await` over promise chains.
- Prefer small, readable functions.
- Avoid unnecessarily long functions.
- Use existing project patterns before introducing new ones.
- Keep comments focused on **why**, not obvious descriptions of what the code does.
- Avoid excessive comments.
- Prefer explicit types where they improve safety/readability.
- Do not use `any` unless there is a concrete compatibility reason.
- When `any` is necessary because of a third-party library/API type mismatch, keep it isolated.
- **[ADD SPECIFIC ESLINT/PRETTIER RULES]**

---

## 6. Decision-Making & Safety

Claude may act without confirmation when:

- Adding normal application logic.
- Fixing bugs.
- Refactoring small isolated pieces without changing behavior.
- Improving types or readability.
- Adding tests.
- Updating existing code within established patterns.

Claude MUST ask for confirmation before:

- Deleting important files.
- Overwriting large amounts of existing code.
- Changing the database schema.
- Running destructive database operations.
- Changing production configuration.
- Changing production infrastructure.
- Changing payment/billing logic in a way that can affect real customers.
- Modifying production Stripe configuration.
- Changing authentication/authorization behavior in a potentially breaking way.

Never silently make destructive changes.

---

## 7. Off-Limits / Protected Areas

Do not modify these without explicit approval:

- Production environment configuration.
- Production secrets.
- Stripe production configuration.
- Database production data.
- **[ADD PROTECTED FILES/DIRECTORIES]**

Do not hard-code secrets, API keys, passwords, tokens, or environment-specific values.

---

## 8. Patterns We Deliberately Avoid

Do NOT introduce:

- Redux unless explicitly requested.
- CSS-in-JS.
- Unnecessary state-management libraries.
- Unnecessary dependencies.
- Microservices for functionality that belongs in the existing backend.
- Duplicate utility functions when an existing helper already solves the problem.
- Hard-coded environment-specific URLs or credentials.
- Custom payment processing when Stripe already provides the required functionality.

**[ADD OTHER FORBIDDEN/AVOIDED PATTERNS]**

---

## 9. External Services

Current external services include:

- Stripe — subscriptions and payment processing.
- Redis — caching.
- PostgreSQL — primary database.
- **[ADD OTHER SERVICES/APIs]**

Claude should not:

- Call production APIs unnecessarily.
- Create or modify production resources without approval.
- Change external service configuration without explaining the impact first.

---

## 10. Architecture

The project consists of a frontend and backend.

### Frontend

- React
- Tailwind CSS
- **[ADD ROUTER / BUILD TOOL / OTHER TECHNOLOGIES]**

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Redis

### High-Level Structure

```text
project/
├── frontend/
│   ├── dist
│   ├──public
│   │    ├──loga i dokumenty pdf
│   ├──src
│   │    |   App.css
│   │    |   App.tsx
│   │    |   index.css
│   │    |   main.tsx
│   │    |   touch
│   │    |   tree.txt
│   │    |
│   │    +---assets
│   │    +---components
│   │    |       Preloader.tsx
│   │    |
│   │    +---context
│   │    |       AuthContext.tsx
│   │    |       LocationContext.tsx
│   │    |
│   │    +---pages
│   │    |       ForRestaurantsPage.tsx
│   │    |       HomePage.tsx
│   │    |       LoginPage.tsx
│   │    |       MapPage.tsx
│   │    |       NotFoundPage.tsx
│   │    |       RegisterPage.tsx
│   │    |       ResetPasswordPage.tsx
│   │    |       RestaurantDetailPage.tsx
│   │    |       RestaurantsPage.tsx
│   │    |
│   │    \---types
│   │            index.ts
│   ├──.env
│   ├──reszta plików konfiguracyjnych
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── lib/
│   │   ├── services/
│   │   └── data/
│   ├── pliki konfiguracyjne
│   │
│   ├── prisma/
│   ├── schema.prisma
│   │
│   ├── .claude
│   ├── .agents
│   ├── .windsurf
│   └── dist
├── buisness/
├── docs/dokumentacja
├── scrapper - serwis fb
```

## 11. Key Files

Before modifying core functionality, inspect the relevant files.

# Important backend files include:

- server.ts — Express application and middleware configuration.
- routes/payments.ts — Stripe Checkout, subscriptions, webhooks and billing portal.
- middleware/auth.ts — authentication/authorization.
- lib/prisma.ts — Prisma client.
- lib/redis.ts — Redis client.
- prisma/schema.prisma — database schema.

# Important frontend files:

- [ADD IMPORTANT FRONTEND FILES]

## 12. Payments & Stripe

Stripe subscriptions are based on Stripe Products/Prices.

Environment variables include:

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_BASE
- STRIPE_PRICE_PROMOTION
- FRONTEND_URL

Do not hard-code Stripe Price IDs.

Recurring subscriptions currently use Stripe card payments.

Przelewy24 should NOT be assumed to support recurring Stripe subscriptions.

Stripe webhook handling must preserve the raw request body.

The current Express setup stores the raw body using:

```ts
express.json({
	verify: (req: any, _res, buf) => {
		req.rawBody = buf
	},
})
```

Do not add another express.raw() middleware to the payments router without explicitly reviewing the middleware architecture.

## 13. Environment Variables

Never commit actual values.

Current variables:

- STRIPE_SECRET_KEY — Stripe secret API key.
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret.
- STRIPE_PRICE_BASE — Stripe Price ID for BASE.
- STRIPE_PRICE_PROMOTION — Stripe Price ID for PROMOTION.
- FRONTEND_URL — frontend URL used for redirects/CORS.
- [ADD ALL OTHER ENV VARIABLES]

## 14. Known Issues & Workarounds

Stripe Webhooks

Stripe webhook events should be treated as potentially duplicated and potentially arriving in a different order.

Use idempotent database operations where appropriate.

Payment.providerPaymentId is unique and should be based on the Stripe invoice/event identifier where appropriate.

Do not assume that:

checkout.session.completed

will always arrive before:

invoice.paid

[ADD OTHER KNOWN ISSUES / WORKAROUNDS]

## 15. Database Changes

Database schema changes require human review before execution.

Claude may prepare:

Prisma schema changes.
Migration files.
Queries.
Index recommendations.

But should not automatically perform destructive database operations.

Never delete production data unless explicitly instructed.

## 16. Testing

Try to test in the simplest way possible without creating additional files without permission; always ask if the developer would prefer to test it themselves.

## 17. FINAL RULE

When working on project:

- Understand the existing implementation first.
- Reuse existing architecture and utilities.
- Make the smallest reasonable change.
- Do not invent requirements.
- Do not silently change business logic.
- Protect production configuration and data.
- Prefer simple, maintainable solutions.
- Verify changes before considering the task complete.
