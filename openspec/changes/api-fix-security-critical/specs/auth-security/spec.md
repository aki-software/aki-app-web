# auth-security Specification

## Purpose

Core authentication security including admin bypass removal, timing-safe comparisons, and JWT revocation.

## Requirements

### Requirement: Admin Authentication MUST Use Database

The system MUST NOT use hardcoded credentials for admin authentication. All authentication attempts MUST be validated against the database with constant-time comparison.

#### Scenario: Admin login with valid credentials

- GIVEN an admin user exists in the database with email "admin@akit.app"
- WHEN the admin submits login credentials
- THEN the system validates the password using constant-time comparison
- AND returns a JWT token on success
- AND returns 401 on failure

#### Scenario: Admin login attempt with env var credentials (attack attempt)

- GIVEN an attacker knows the ADMIN_USER and ADMIN_PASS environment variables
- WHEN the attacker submits those credentials
- THEN the system MUST NOT bypass database validation
- AND returns 401 (invalid credentials)

#### Scenario: Admin login with constant-time comparison

- GIVEN an admin user exists in the database
- WHEN any login attempt is made
- THEN the password comparison uses `crypto.timingSafeEqual`
- AND timing differences between valid and invalid attempts are not measurable

### Requirement: Session Metrics MUST Enforce Ownership

The system MUST enforce scope-based access control on session metrics endpoints. Users MUST only access metrics for sessions they own or have institutional access to.

#### Scenario: Therapist views own session metrics

- GIVEN a therapist is authenticated
- WHEN they request metrics for a session they created
- THEN the system returns the session metrics
- AND returns 200

#### Scenario: Therapist attempts to view another therapist's session metrics

- GIVEN therapist A is authenticated
- WHEN they request metrics for a session created by therapist B
- THEN the system returns 403 (forbidden)

#### Scenario: Admin views any session metrics

- GIVEN an admin is authenticated
- WHEN they request metrics for any session
- THEN the system returns the session metrics
- AND returns 200

### Requirement: Rate Limiting MUST Use Authenticated Identity

The rate limit key MUST be based on the authenticated user's ID when available, falling back to IP address for anonymous requests.

#### Scenario: Authenticated user hits rate limit

- GIVEN a user is authenticated with ID "user-123"
- WHEN they make requests to a rate-limited endpoint
- THEN the rate limit counter uses "user-123" as the key
- AND other users' rate limits are not affected

#### Scenario: Anonymous user hits rate limit

- GIVEN no user is authenticated
- WHEN requests come from IP "192.168.1.1"
- THEN the rate limit counter uses "192.168.1.1" as the key
- AND the limit is shared across all anonymous requests from that IP

### Requirement: Password Change MUST Invalidate Existing Tokens

When a user changes or resets their password, all existing JWT tokens for that user MUST be invalidated.

#### Scenario: User changes password

- GIVEN a user is authenticated with an active JWT
- WHEN they change their password
- THEN the existing JWT is invalidated
- AND subsequent requests with the old JWT return 401
- AND a new JWT is issued

#### Scenario: User resets password via email

- GIVEN a user requests a password reset
- WHEN they complete the reset flow
- THEN all existing JWTs for that user are invalidated
- AND they receive a new JWT

### Requirement: User Creation MUST Validate Input

The system MUST validate all user creation requests using class-validator DTOs. Unknown properties MUST be stripped.

#### Scenario: Create user with valid data

- GIVEN an admin creates a new user
- WHEN they submit a request with name, email, role, and institutionId
- THEN the system validates all fields
- AND creates the user with the provided data
- AND returns 201

#### Scenario: Create user with invalid data

- GIVEN an admin creates a new user
- WHEN they submit a request with missing required fields
- THEN the system returns 400 with validation errors
- AND no user is created

#### Scenario: Create user with unknown properties

- GIVEN an admin creates a new user
- WHEN they submit a request with additional unknown fields
- THEN the system strips the unknown fields
- AND creates the user with only the valid fields
