# Daily Dish — Project Rules

## 1. Project Overview

Daily Dish is a public, responsive web application for discovering daily dishes and food offers from restaurants.

The project is intended to evolve into a publicly available application.

The exact business logic, data sources, fetching mechanisms, parsing methods and external integrations may change over time.

Do not assume that the current implementation is the final product.

The architecture must therefore remain modular and easy to extend.

---

# 2. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## Backend

- Node.js
- Express
- TypeScript

## Database

- PostgreSQL
- Prisma ORM

## External integrations

External APIs and services may be added or removed depending on the project requirements.

Examples may include:

- Meta / Facebook APIs
- restaurant APIs
- third-party food platforms
- scraping services
- image services
- geolocation services
- authentication providers

Do not hard-code the architecture around one external provider.

---

# 3. Core Architecture

The application consists of three main layers:

```text
Frontend
    ↓
Backend API
    ↓
Database
```

External services are accessed by the backend:

```text
Frontend
    ↓
Backend
    ↓
External APIs
    ↓
Backend
    ↓
Database
    ↓
Frontend
```

The frontend must never directly access private external APIs or secret credentials.

The backend is responsible for:

- business logic
- authentication and authorization
- database access
- external API communication
- validation
- data normalization
- error handling
- security-sensitive operations

The frontend is responsible for:

- UI
- user interaction
- client-side state
- displaying API data
- basic client-side validation
- responsive behavior

---

# 4. General Development Principles

## Keep the project simple

Do not introduce unnecessary complexity.

Do not add:

- microservices
- Redis
- message queues
- workers
- Kubernetes
- complicated caching
- event buses
- unnecessary dependencies

unless there is a real technical reason.

Start with a modular monolith.

The architecture should allow future extraction of services if the project grows.

---

# 5. Modularity

Code should be organized by responsibility.

Avoid large files containing unrelated functionality.

Prefer:

```text
backend/src/
├── routes/
├── services/
├── controllers/
├── middleware/
├── lib/
├── utils/
├── types/
└── config/
```

Frontend:

```text
frontend/src/
├── components/
├── pages/
├── layouts/
├── services/
├── hooks/
├── types/
├── utils/
└── lib/
```

Do not create folders only for the sake of creating folders.

Use a structure appropriate to the current project size.

---

# 6. Separation of Responsibilities

Routes should remain thin.

Avoid putting large business logic directly inside Express routes.

Bad:

```ts
router.post('/something', async (req, res) => {
    // hundreds of lines of business logic
})
```

Prefer:

```ts
router.post('/something', controller)
```

and:

```text
route
  ↓
controller
  ↓
service
  ↓
repository / Prisma
```

For small features, some layers may be combined when that improves simplicity.

Do not create abstractions that provide no practical value.

---

# 7. Business Logic

Business logic must not be tightly coupled to:

- Express
- React
- Prisma
- Facebook
- a specific external provider
- a specific UI component

Whenever practical, business logic should operate on application-level types and data.

External provider data should be normalized before entering the core application logic.

Example:

```text
External API
    ↓
Provider adapter
    ↓
Normalized application data
    ↓
Business logic
    ↓
Database
```

This makes it possible to replace an external provider later.

---

# 8. External APIs

External integrations must be isolated.

Do not spread provider-specific API calls throughout the application.

Prefer:

```text
services/
    providers/
        facebook/
        restaurant-api/
        ...
```

or another equivalent structure appropriate to the project.

Provider-specific:

- authentication
- API URLs
- request formats
- response formats
- error handling
- rate limits

must stay inside the provider integration.

The rest of the application should consume normalized data.

---

# 9. External API Failures

External services are unreliable.

The application must assume that:

- an API can be unavailable,
- requests can timeout,
- rate limits can occur,
- responses can change,
- authentication can expire,
- data can be incomplete,
- individual resources can disappear.

A failure from one external source should not automatically crash the entire application.

Handle failures gracefully.

Return useful errors.

Log technical details on the backend.

Do not expose sensitive technical details to users.

---

# 10. Database

PostgreSQL is the primary database.

Prisma is used as the ORM.

Database schema should represent application data, not external API response structures.

Do not blindly copy external API objects into the database.

Normalize important data.

Use proper:

- relations
- indexes
- constraints
- unique fields
- nullable fields
- timestamps

Avoid premature database optimization.

Add indexes when justified by actual queries.

---

# 11. Prisma Rules

Use Prisma migrations for schema changes.

Example:

```bash
npx prisma migrate dev --name <migration-name>
```

After schema changes, regenerate Prisma Client when required:

```bash
npx prisma generate
```

Never manually modify generated Prisma files.

Do not delete migrations just to solve a development problem.

Database changes must be deliberate.

---

# 12. Data Integrity

The backend is the source of truth.

Never trust data received from the frontend.

Always validate:

- IDs
- strings
- numbers
- dates
- URLs
- enums
- optional values
- user-provided content

Validate data before writing it to the database.

Do not rely exclusively on TypeScript types for runtime validation.

---

# 13. API Design

The backend exposes a REST API unless there is a strong reason to use another approach.

Use predictable endpoints.

Example:

```text
GET    /api/...
POST   /api/...
PUT    /api/...
PATCH  /api/...
DELETE /api/...
```

Use meaningful HTTP status codes.

Examples:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
```

Do not return `200` for every type of error.

---

# 14. API Responses

Use consistent response structures.

For successful responses, prefer predictable JSON.

Example:

```json
{
  "data": {},
  "message": "Success"
}
```

For errors:

```json
{
  "error": {
    "code": "SOME_ERROR",
    "message": "Human readable message"
  }
}
```

Do not expose:

- stack traces
- database credentials
- API keys
- access tokens
- internal file paths
- sensitive infrastructure information

in production responses.

---

# 15. Authentication

If authentication is introduced:

- authentication belongs to the backend,
- passwords must never be stored in plaintext,
- sessions/tokens must be handled securely,
- authorization must be checked server-side,
- frontend route protection is not sufficient.

Never trust:

```text
isAdmin
isAuthenticated
role
userId
```

provided by the frontend.

The backend must determine the authenticated user and permissions.

---

# 16. Authorization

Authentication answers:

```text
Who is the user?
```

Authorization answers:

```text
What can the user do?
```

Always perform authorization checks on the backend.

Do not rely on hiding buttons in React.

Example:

```text
Frontend:
hide "Delete"

Backend:
verify user permission
↓
allow / reject
```

---

# 17. Security

Security is a project requirement, not an optional feature.

Never commit:

```text
.env
API keys
tokens
passwords
private keys
secrets
```

Use environment variables for secrets.

Never expose backend secrets through:

```text
VITE_*
```

or frontend source code.

Use HTTPS in production.

Validate all user input.

Prevent:

- SQL injection
- XSS
- CSRF where applicable
- command injection
- path traversal
- insecure direct object references
- unauthorized API access

Use appropriate security middleware when needed.

---

# 18. Environment Variables

Use environment variables for configuration.

Example:

```env
DATABASE_URL=
PORT=
API_URL=
EXTERNAL_API_KEY=
EXTERNAL_API_SECRET=
```

Never hard-code secrets.

Provide a safe example file when useful:

```text
.env.example
```

Example:

```env
DATABASE_URL=
PORT=3000
```

Do not put real credentials into `.env.example`.

---

# 19. Frontend Principles

The frontend must be:

- responsive
- accessible
- fast
- simple
- consistent
- mobile-friendly

Use mobile-first design.

The UI should work on:

```text
mobile
tablet
desktop
```

Do not optimize only for desktop.

---

# 20. Tailwind CSS

Tailwind CSS is the preferred styling system.

Avoid unnecessary custom CSS.

Prefer reusable components over repeating large Tailwind class strings.

Do not introduce another UI framework unless explicitly required.

Keep visual design consistent.

---

# 21. React Components

Components should have one clear responsibility.

Avoid huge components such as:

```text
App.tsx
```

containing:

- API requests
- database logic
- authentication
- business logic
- large UI trees
- form validation
- unrelated state

Separate responsibilities into appropriate components, hooks and services.

---

# 22. API Communication

Frontend API calls should be centralized where practical.

Prefer:

```text
services/api.ts
services/restaurants.ts
services/dishes.ts
```

instead of scattering raw `fetch()` calls throughout components.

Do not duplicate API logic.

---

# 23. State Management

Do not introduce Redux or another global state manager unless the application actually needs it.

Prefer:

- React state
- context where appropriate
- custom hooks
- server state patterns

Use the simplest solution that works.

---

# 24. Loading States

Every asynchronous operation should have an appropriate loading state.

Examples:

```text
Loading...
Skeleton
Spinner
Disabled button
Progress indicator
```

Do not allow users to repeatedly submit the same action unintentionally.

---

# 25. Error Handling

Errors must be handled on both frontend and backend.

Frontend should show useful messages such as:

```text
Nie udało się pobrać danych.
Spróbuj ponownie.
```

Do not display raw backend exceptions to users.

Backend logs should contain enough information for debugging.

---

# 26. Responsive Design

Every new UI feature must be tested conceptually for:

```text
320px+
768px+
1024px+
1440px+
```

Do not assume large screens.

Avoid:

- fixed widths that break mobile
- horizontal overflow
- tiny buttons
- unreadable text
- inaccessible forms

---

# 27. Accessibility

Use semantic HTML.

Prefer:

```html
button
nav
main
header
section
article
form
label
```

over generic `div` elements where appropriate.

Interactive elements must be keyboard accessible.

Images should have meaningful `alt` text when appropriate.

Forms must have labels.

Do not use color as the only way to communicate information.

---

# 28. Performance

Performance matters because the application is public.

Avoid unnecessary:

- API requests
- database queries
- re-renders
- large dependencies
- huge images
- duplicated data processing

Do not prematurely optimize.

Optimize measurable bottlenecks.

---

# 29. Images

External images may fail or disappear.

The application must handle missing images gracefully.

Always provide a fallback UI.

Do not assume external image URLs will remain valid forever.

When possible, optimize image loading.

Use appropriate image dimensions and formats.

---

# 30. Caching

Caching may be introduced when justified.

Do not add Redis or another caching system simply because it is popular.

First establish:

```text
correctness
then
performance
then
scaling
```

Cache only data that is safe to cache.

Understand cache invalidation before implementing it.

---

# 31. Rate Limiting

Public APIs must consider abuse.

Rate limiting should be added to sensitive or expensive endpoints.

Especially protect endpoints that:

- call external APIs
- trigger expensive operations
- perform heavy database operations
- send emails/messages
- authenticate users

Do not allow unlimited public access to expensive operations.

---

# 32. Logging

Backend logging should help diagnose production problems.

Log:

- errors
- failed external API requests
- important system events
- unexpected states

Do not log:

- passwords
- tokens
- API keys
- private user information
- sensitive request data

Use structured logging when the application grows.

---

# 33. Monitoring

As the project becomes public, consider:

- error tracking
- application metrics
- uptime monitoring
- API latency monitoring
- database monitoring

Do not introduce a large monitoring stack unnecessarily during early development.

---

# 34. Testing

Important business logic should be testable.

Tests should eventually cover:

- API endpoints
- services
- parsers
- authentication
- authorization
- important database operations
- external API adapters

Do not write meaningless tests only to increase coverage percentage.

Test behavior.

---

# 35. TypeScript

Use TypeScript strictly.

Avoid:

```ts
any
```

unless there is a legitimate reason.

Prefer explicit types.

Do not silence TypeScript errors with:

```ts
// @ts-ignore
```

unless absolutely necessary.

Do not use type assertions to hide real bugs.

---

# 36. Code Quality

Prefer readable code over clever code.

Good:

```ts
const activeRestaurants = await getActiveRestaurants()
```

Avoid unnecessarily complicated abstractions.

Use meaningful names.

Avoid:

```text
data
thing
foo
bar
tmp
```

when a meaningful name is possible.

---

# 37. Dependencies

Before installing a package, ask:

1. Do we actually need it?
2. Can the existing stack solve the problem?
3. Is the package maintained?
4. Does it introduce unnecessary complexity?
5. Does it significantly increase bundle size?

Do not install libraries for trivial functionality.

---

# 38. Git

Use small, logical commits.

Commit messages should describe the change.

Examples:

```text
feat: add restaurant management
fix: handle failed external requests
refactor: separate dish parser
chore: update dependencies
```

Do not commit:

```text
.env
node_modules/
dist/
build/
temporary files
IDE files
```

---

# 39. Backward Compatibility

When modifying an existing feature:

1. Understand the current behavior.
2. Identify dependencies.
3. Make the smallest safe change.
4. Check affected endpoints/components.
5. Verify that existing functionality still works.

Do not rewrite working parts of the application without a reason.

---

# 40. Minimal Changes

When fixing a bug, change as little as necessary.

Do not:

- rewrite unrelated files,
- rename unrelated components,
- change the entire architecture,
- replace libraries,
- refactor unrelated code

unless explicitly requested.

A bug fix should remain a bug fix.

---

# 41. Refactoring

Refactor when there is a real benefit.

Good reasons:

- duplicated logic
- difficult maintenance
- poor separation of responsibilities
- measurable performance issue
- security issue
- growing complexity

Do not refactor only because another architecture looks nicer.

---

# 42. AI Development Rules

When using Gemini or another coding AI:

1. Inspect existing code before modifying it.
2. Understand the current architecture.
3. Reuse existing functionality.
4. Do not recreate existing services/components.
5. Make minimal changes.
6. Do not change technologies without permission.
7. Do not invent APIs or library behavior.
8. Do not assume external APIs work a certain way.
9. Verify errors instead of guessing.
10. Keep changes focused.

---

# 43. Token Efficiency

Responses should be concise and practical.

Do not repeat project documentation unnecessarily.

Do not explain obvious code.

Do not output entire files when only a few lines need to change.

Prefer:

```text
File:
backend/src/routes/example.ts

Change:
Replace X with Y.
```

When a complete file is genuinely easier to apply, provide the complete file.

Avoid unnecessary prose.

Do not generate speculative code before understanding the existing implementation.

---

# 44. Before Changing Code

Before implementing a non-trivial feature:

1. Inspect relevant files.
2. Identify existing patterns.
3. Identify dependencies.
4. Determine the smallest implementation.
5. Implement.
6. Check TypeScript.
7. Check build/tests where available.

Do not blindly create new files.

---

# 45. Debugging Rules

When debugging:

```text
1. Read the exact error.
2. Locate the source.
3. Identify the root cause.
4. Fix the root cause.
5. Verify the result.
```

Do not randomly change configuration files until the error disappears.

Do not hide errors.

Do not disable TypeScript, ESLint, security checks or validation just to make the project run.

---

# 46. Production Readiness

Before exposing the application publicly, review:

```text
Authentication
Authorization
Validation
Rate limiting
CORS
HTTPS
Secrets
Error handling
Logging
Database security
API security
Dependency vulnerabilities
Performance
Backups
Monitoring
```

Development configuration must not automatically be considered production-safe.

---

# 47. Scalability

The project should be capable of growing from:

```text
small private application
```

to:

```text
public application
```

and eventually:

```text
many users
many restaurants
many requests
```

However:

Do not build for millions of users before the application has users.

Prefer incremental scaling.

---

# 48. Architecture Evolution

The current architecture is not permanent.

The project may later introduce:

- authentication
- user accounts
- restaurant accounts
- favorites
- search
- filtering
- geolocation
- notifications
- scheduled fetching
- background jobs
- caching
- queues
- analytics
- subscriptions
- mobile applications
- additional external providers

These should be introduced only when required.

Do not design the current project around hypothetical future features.

---

# 49. Public Application Principles

Because Daily Dish is intended to become public:

The application must not depend on:

- one specific developer account
- one specific machine
- local files
- hardcoded localhost URLs
- development-only credentials
- manual database modifications
- undocumented setup steps

Configuration must be environment-based.

The project should be deployable from a clean environment using documented commands.

---

# 50. Documentation

Keep documentation focused.

Important documentation should include:

```text
README.md
.env.example
API documentation when needed
setup instructions
development instructions
deployment instructions
```

Do not create documentation for every small function.

Code should be understandable without excessive comments.

---

# 51. Comments

Comments should explain WHY, not WHAT.

Bad:

```ts
// Get restaurants
const restaurants = await getRestaurants()
```

Good:

```ts
// Only active restaurants can participate in external data fetching.
const restaurants = await getActiveRestaurants()
```

Do not fill the code with unnecessary comments.

---

# 52. Environment Separation

Support at least:

```text
development
production
```

When the project grows, consider:

```text
test
staging
production
```

Never use production credentials during local development.

---

# 53. API and Database Security

Never assume that hiding an endpoint from the frontend makes it private.

Every protected operation must be protected server-side.

Never trust:

```text
frontend validation
frontend roles
frontend IDs
frontend prices
frontend permissions
```

The backend validates everything important.

---

# 54. Data Privacy

If user accounts are introduced, collect only the data that is actually necessary.

Do not store sensitive information without a clear reason.

The public version must eventually consider:

- privacy policy
- terms of service
- cookie requirements
- data retention
- user deletion
- GDPR requirements where applicable

Do not implement legal claims without verifying the actual requirements.

---

# 55. External Content

Restaurant information, images and posts may come from third-party sources.

The application must handle:

- deleted content
- unavailable content
- changed URLs
- incorrect information
- duplicate content
- missing images
- provider outages

Do not assume external content is permanent.

---

# 56. Source Abstraction

The application should conceptually treat external sources as providers.

Example:

```text
DataProvider
    ├── FacebookProvider
    ├── RestaurantApiProvider
    └── OtherProvider
```

The application should consume normalized data where possible.

Example:

```ts
interface DishSource {
    sourceId: string
    sourceUrl?: string
    title?: string
    description?: string
    imageUrl?: string
    publishedAt?: Date
}
```

The exact interface may change with the project.

The important rule is:

External provider format should not dictate the entire application architecture.

---

# 57. No Premature AI

AI may be used if it provides real value.

Do not add AI simply because the project contains unstructured text.

For example, a deterministic parser should be preferred when the input format is predictable.

AI may be appropriate when:

- restaurant posts are highly inconsistent,
- extraction requires semantic understanding,
- classification is difficult,
- normalization benefits significantly from AI.

AI calls must consider:

- cost
- latency
- rate limits
- reliability
- privacy
- fallback behavior

Never make the entire application unusable because an AI provider is temporarily unavailable.

---

# 58. No Premature Automation

Automation may be introduced later.

Do not assume the application needs:

- cron jobs
- scheduled workers
- queues
- webhooks
- background processing

unless the actual product requirements justify them.

The architecture should allow automation later without requiring it now.

---

# 59. Product Philosophy

Daily Dish should prioritize:

```text
Simple
Fast
Useful
Reliable
Responsive
```

over:

```text
Complex
Over-engineered
Feature-heavy
Technically impressive but unnecessary
```

The user should be able to open the application and quickly find something to eat.

---

# 60. Final Rule

When there is a choice between:

```text
simple solution that is easy to maintain
```

and:

```text
complex solution with unnecessary abstraction
```

choose the simple solution.

When the simple solution becomes a real limitation, evolve the architecture based on actual requirements.

Always preserve:

```text
Security
Correctness
Maintainability
Performance
User experience
```

These principles have priority over implementation convenience.
