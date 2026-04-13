# Contract Changelog

## 1.1.0 - 2026-04-13

- Added runtime schemas with `zod` for vouchers and app errors.
- Added stable voucher redeem contracts (`RedeemVoucherRequest`, `RedeemVoucherResponse`).
- Added shared list/batch voucher response schemas.
- Added JSON schema export script for mobile code generation.
- Added stable error catalog (`INVALID_CODE`, `ALREADY_USED`, `SESSION_NOT_FOUND`, `UNAUTHORIZED`, `VALIDATION_ERROR`).

## Versioning policy

- Patch: non-breaking internal fixes.
- Minor: backward-compatible additions (new optional fields/contracts).
- Major: breaking changes in existing contract shapes or semantics.
