# Delta for design-tokens

## ADDED Requirements

### Requirement: Status Color Tokens

The system MUST define `--color-status-success`, `--color-status-error`, and `--color-status-warning` for semantic state representation.

#### Scenario: Status tokens generated
- GIVEN theme.css is loaded
- WHEN a consumer checks for status tokens
- THEN `--color-status-success`, `--color-status-error`, and `--color-status-warning` MUST be available with valid hex values

### Requirement: Warning Color Tokens

The system MUST define `--color-warning-soft`, `--color-warning-medium`, and `--color-warning-strong` for the warning palette (e.g., LowStockAlert).

#### Scenario: Warning palette generated
- GIVEN theme.css is loaded
- WHEN a consumer checks for warning palette tokens
- THEN `--color-warning-soft`, `--color-warning-medium`, and `--color-warning-strong` MUST be available with valid hex values
