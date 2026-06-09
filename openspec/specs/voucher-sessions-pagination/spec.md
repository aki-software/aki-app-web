# Voucher Sessions Pagination Specification

## Purpose

Enable client-side pagination of the voucher sessions table to improve navigation when many sessions exist. No backend changes — all pagination is handled in the frontend.

## Requirements

### Requirement: Fixed page size

The VoucherSessionsTable MUST display 10 sessions per page.

#### Scenario: First page default

- GIVEN a list of 25 voucher sessions
- WHEN the table renders
- THEN only the first 10 sessions are displayed

#### Scenario: Fewer sessions than page size

- GIVEN a list of 3 voucher sessions
- WHEN the table renders
- THEN all 3 sessions are displayed
- AND pagination controls SHOULD NOT render

### Requirement: Page navigation with numbered buttons

The Pagination molecule MUST display page number buttons between the previous and next controls.

#### Scenario: Navigate to page 2

- GIVEN the table showing page 1 of 3
- WHEN the user clicks the page 2 button
- THEN sessions 11–20 are displayed
- AND page 2 is highlighted as active

#### Scenario: Navigate to partial last page

- GIVEN 25 sessions (3 pages, last page has 5)
- WHEN the user clicks page 3
- THEN sessions 21–25 are displayed

#### Scenario: Active page is highlighted

- GIVEN the table on page 1
- WHEN it renders
- THEN the page 1 button MUST have an active visual state
- AND the previous button SHOULD be disabled

### Requirement: Existing client-side filters work within current page

Date and duration filters MUST continue to operate on the displayed page data.

#### Scenario: Filter reduces results on current page

- GIVEN 10 sessions on page 1
- WHEN a date range filter matches 3 sessions
- THEN only those 3 sessions are visible

#### Scenario: Filter yields empty state

- GIVEN 10 sessions on page 1
- WHEN a filter matches 0 sessions
- THEN the table displays a "no results" message
- AND the user MAY reset the filter to restore the full page
