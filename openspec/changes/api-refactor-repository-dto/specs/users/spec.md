# Spec: api/refactor/repository-dto

## Users: DTO discipline

### Requirement: Validated create payload
`UsersController.create()` and `UsersController.register()` MUST accept a class-validator DTO (`CreateUserDto` and `RegisterUserDto` respectively) instead of an inline structural type. The global `ValidationPipe` MUST reject payloads with extra or missing required fields.

#### Scenario: Valid payload
- Given an admin request with `{ name: "Ada", role: "THERAPIST" }` to `POST /users`
- Then the response is `201 Created` with the user summary.

#### Scenario: Extra field
- Given an admin request with `{ name: "Ada", isAdmin: true }` to `POST /users`
- Then the response is `400 Bad Request` because the DTO does not declare `isAdmin` and `forbidNonWhitelisted` is enabled.

### Requirement: Validated list query
`UsersController.findAll()` MUST accept `ListUsersQueryDto` so the `role` query parameter is validated against `UserRole` before reaching the handler.

#### Scenario: Unknown role
- Given a request to `GET /users?role=foo`
- Then the response is `400 Bad Request` with a clear error.

#### Scenario: Therapist filter
- Given a request to `GET /users?role=THERAPIST`
- Then the handler receives `query.role === UserRole.THERAPIST` and returns the therapist list.

## Users: Controller cleanup

### Requirement: No inline type in handlers
`UsersController` MUST NOT declare `payload: { ... }` inline types. Every request body or query MUST be typed via a DTO class from `apps/api/src/users/dto/`.

### Requirement: No redundant try/catch
`UsersController.resendActivation()` MUST NOT wrap the service call in `try/catch`. The service throws a domain exception; the global filter handles it.
