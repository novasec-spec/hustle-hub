# Payments setup (Premium plan)

Premium costs **KES 650 / USD 5 for 30 days** (override with `PREMIUM_PRICE_KES` / `PREMIUM_PRICE_USD`).
Premium unlocks unlimited AI generations (free plan: 5 per day), CSV export of finances, and a Premium badge.

Every provider is **off until its keys are set** in Vercel → Project → Settings → Environment Variables,
then redeploy. All providers default to **sandbox/test**. To go live, set `<PROVIDER>_ENV=live` and use live keys.

`HH_PAYMENT_SECRET` is already set in Vercel. It lets the server, and only the server, mark payments as paid.

| Provider | Get keys | Env vars | Callback / webhook URL |
|---|---|---|---|
| **M-Pesa STK Push** (Safaricom Daraja) | https://developer.safaricom.co.ke → My Apps → create app with *M-Pesa Express* | `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET` (sandbox shortcode `174379` + passkey are built in). Live: `MPESA_ENV=live`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, optional `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline` for tills | Sent automatically per payment (`/api/pay/mpesa/callback`) |
| **IntaSend** (M-Pesa + cards) | https://sandbox.intasend.com → Settings → API Keys (live: https://payment.intasend.com) | `INTASEND_PUBLISHABLE_KEY` (`ISPubKey_test_…`). Live: `INTASEND_ENV=live` | Redirect back to `/api/pay/intasend/return` (automatic) |
| **Paystack** (cards, M-Pesa) | https://dashboard.paystack.com → Settings → API Keys & Webhooks | `PAYSTACK_SECRET_KEY` (`sk_test_…`), optional `PAYSTACK_CURRENCY` (default `KES`) | Callback is passed per transaction (`/api/pay/paystack/return`) |
| **PayPal** | https://developer.paypal.com/dashboard/applications/sandbox → Create App | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`. Live: `PAYPAL_ENV=live` + live app keys | Return URL is passed per order (`/api/pay/paypal/return`) |
| **Crypto** (NOWPayments) | Sandbox: https://account-sandbox.nowpayments.io → API keys + IPN secret (live: https://account.nowpayments.io) | `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`. Live: `CRYPTO_ENV=live` | IPN `/api/pay/crypto/ipn` is passed per invoice |

## Test credentials

- **M-Pesa sandbox:** use the test MSISDN shown on the Daraja simulator page (e.g. `254708374149`). No real money moves.
- **Paystack test:** card `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`.
- **PayPal sandbox:** sign in with the *Personal* sandbox account at https://developer.paypal.com/dashboard/accounts.
- **IntaSend sandbox:** follow the test instructions on the sandbox checkout page.
- **NOWPayments sandbox:** the sandbox invoice lets you simulate a finished payment.

## How confirmation works

1. The user picks a provider on `/billing` and the server creates a `pending` row in `hh_payments`.
2. The provider confirms the payment by webhook (M-Pesa, crypto) or by redirect (IntaSend, Paystack, PayPal).
   The server then **re-checks with the provider's API** and verifies the amount before calling `hh_settle_payment`.
3. A `paid` settlement extends `hh_subscriptions.current_period_end` by 30 days. Settlement is idempotent.
