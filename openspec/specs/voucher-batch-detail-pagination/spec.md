# Voucher Batch Detail Pagination Specification

## Purpose

Enable server-side paginated fetching of voucher batch detail to improve API performance and UX when batch sizes grow large. The API returns a unified `{ data, count, page, limit }` response wrapper.

## Requirements

### Requirement: Server accepts pagination parameters

The system MUST accept optional `page` and `limit` query params on `GET /vouchers/batches/:batchId`. Default `page` is 1, default `limit` is 20. The `limit` MUST NOT exceed 100.

#### Scenario: Default first page

- GIVEN a batch with 50 vouchers
- WHEN a client requests the endpoint without `page` or `limit`
- THEN the response returns the first 20 vouchers
- AND the `count` field equals 50

#### Scenario: Specific page and limit

- GIVEN a batch with 50 vouchers
- WHEN a client requests `?page=2&limit=10`
- THEN the response returns vouchers 11–20
- AND `page` is 2, `limit` is 10, `count` is 50

#### Scenario: Limit exceeds maximum

- GIVEN a batch with 200 vouchers
- WHEN a client requests `?limit=200`
- THEN the system MUST clamp `limit` to 100
- AND return at most 100 vouchers

### Requirement: Unified paginated response format

The response MUST use `{ data, count, page, limit }` plus existing batch metadata. The previous `vouchers` field SHALL be renamed to `data`.

#### Scenario: Response structure

- GIVEN a successful paginated request
- WHEN the server processes it
- THEN the body MUST include `data` (array), `count` (number), `page` (number), `limit` (number), `batchId`, `ownerInstitutionName`, `ownerUserName`, `createdAt`, `expiresAt`, `total`, `available`, `used`, `pending`

#### Scenario: Empty page

- GIVEN a batch with 5 vouchers and limit 10
- WHEN a client requests `?page=2`
- THEN `data` MUST be an empty array
- AND `count` MUST be 5

#### Scenario: Backward compatibility without pagination params

- GIVEN a client that does not send `page`/`limit`
- WHEN it calls the endpoint
- THEN the server MUST return all vouchers in the `data` array (same behavior as pre-pagination)

### Requirement: Frontend refetches on page change

The BatchDetailDrawer MUST send the selected `page` param to the server when the user navigates, replacing client-side slicing.

#### Scenario: Navigate to page 2

- GIVEN a BatchDetailDrawer open on a batch with 40 vouchers
- WHEN the user clicks page 2
- THEN the drawer MUST fetch `?page=2&limit=20`
- AND display the response data

#### Scenario: Navigate back

- GIVEN a BatchDetailDrawer on page 3
- WHEN the user clicks page 2
- THEN the drawer MUST fetch `?page=2&limit=20`
- AND display vouchers 21–40
