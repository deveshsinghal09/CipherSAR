# Dataset contract

CipherSAR ships with deterministic synthetic data and also accepts caller-supplied JSON or transaction CSV files.

## Transaction fields

| Field | Required | Example | Notes |
| --- | --- | --- | --- |
| `id` | yes | `TX-4521-1` | Unique transaction identifier. CSV also accepts `transaction_id`. |
| `customerId` | yes | `CUS-4521` | CSV uses `customer_id`. |
| `timestamp` | yes | `2026-07-24T10:00:00.000Z` | Any JavaScript-parseable CSV date is normalized to ISO; API JSON requires ISO datetime. |
| `amount` | yes | `9750` | Non-negative number. |
| `currency` | yes for API | `USD` | CSV defaults to USD. |
| `type` | yes | `cash_deposit` | One of `cash_deposit`, `cash_withdrawal`, `wire_in`, `wire_out`, `card`, `ach`. |
| `country` | yes for API | `US` | CSV defaults to US. |
| `branchId` | no | `BR-2` | CSV uses `branch_id`. |
| `counterpartyId` | no | `CP-19` | CSV uses `counterparty_id`. |
| `segment` | yes for API | `retail` | `retail`, `business`, or `private`; CSV defaults to retail. |
| `channel` | yes for API | `branch` | `branch`, `online`, `mobile`, or `atm`; CSV defaults to online. |

## Customer fields

JSON investigations may include customer records:

| Field | Required | Values |
| --- | --- | --- |
| `id` | yes | Unique customer ID |
| `name` | yes | Display name |
| `segment` | yes | `retail`, `business`, `private` |
| `country` | yes | Country code |
| `riskRating` | yes | `standard`, `elevated` |
| `accountOpenedAt` | yes | ISO datetime |

## Privacy

The included records are synthetic and must not be interpreted as real people or businesses. Do not commit real bank or customer data to this repository. Production data ingestion must use approved secure channels and retention controls.
