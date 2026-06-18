"""
Impact Grid - Live Currency Service
Fetches rates from exchangerate-api.com with DB fallback
"""

import os
from datetime import datetime, timedelta
from typing import Dict

FALLBACK_RATES = {
    "USD": 1.0,
    "INR": 83.5,
    "EUR": 0.92,
    "GBP": 0.79,
    "CAD": 1.35,
    "AUD": 1.52,
    "SGD": 1.34,
    "JPY": 150.2,
}

CURRENCY_SYMBOLS = {
    "USD": "$",
    "INR": "₹",
    "EUR": "€",
    "GBP": "£",
    "CAD": "C$",
    "AUD": "A$",
    "SGD": "S$",
    "JPY": "¥",
}


async def fetch_live_rates(base: str = "USD") -> Dict[str, float]:
    """Fetch live exchange rates. Returns fallback on failure."""
    try:
        import httpx

        url = f"https://api.exchangerate-api.com/v4/latest/{base}"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("rates", FALLBACK_RATES)
    except Exception as e:
        print(f"[Currency] Live fetch failed: {e}. Using fallback rates.")
    return FALLBACK_RATES


async def refresh_rates_in_db(db) -> bool:
    """Fetch live rates and store in DB exchange_rates table."""
    from .models import ExchangeRate, SystemSetting

    try:
        rates = await fetch_live_rates("USD")
        now = datetime.utcnow()
        for currency, rate in rates.items():
            existing = (
                db.query(ExchangeRate)
                .filter(
                    ExchangeRate.from_currency == "USD",
                    ExchangeRate.to_currency == currency,
                )
                .first()
            )
            if existing:
                existing.rate = rate
                existing.updated_at = now
            else:
                db.add(
                    ExchangeRate(
                        from_currency="USD",
                        to_currency=currency,
                        rate=rate,
                        updated_at=now,
                    )
                )

        # Update INR setting
        inr_rate = rates.get("INR", 83.5)
        setting = (
            db.query(SystemSetting)
            .filter(SystemSetting.key == "currency.exchange_rate_usd_to_inr")
            .first()
        )
        if setting:
            setting.value = str(inr_rate)
            setting.updated_at = now

        db.commit()
        print(f"[Currency] Rates refreshed. USD->INR: {inr_rate}")
        return True
    except Exception as e:
        db.rollback()
        print(f"[Currency] DB update failed: {e}")
        return False


def get_rate(db, from_currency: str, to_currency: str) -> float:
    """Get exchange rate from DB, fallback to hardcoded."""
    if from_currency == to_currency:
        return 1.0
    try:
        from .models import ExchangeRate

        row = (
            db.query(ExchangeRate)
            .filter(
                ExchangeRate.from_currency == from_currency,
                ExchangeRate.to_currency == to_currency,
            )
            .first()
        )
        if row:
            return float(row.rate)
        # Try reverse
        reverse = (
            db.query(ExchangeRate)
            .filter(
                ExchangeRate.from_currency == to_currency,
                ExchangeRate.to_currency == from_currency,
            )
            .first()
        )
        if reverse and float(reverse.rate) != 0:
            return round(1 / float(reverse.rate), 6)
    except Exception:
        pass
    # Fallback: convert via USD
    from_usd = FALLBACK_RATES.get(from_currency, 1.0)
    to_usd = FALLBACK_RATES.get(to_currency, 1.0)
    return round(to_usd / from_usd, 6)


def convert(amount: float, from_currency: str, to_currency: str, db=None) -> float:
    if from_currency == to_currency:
        return round(amount, 2)
    rate = (
        get_rate(db, from_currency, to_currency)
        if db
        else FALLBACK_RATES.get(to_currency, 1.0)
    )
    return round(amount * rate, 2)


def format_currency(amount: float, currency: str) -> str:
    symbol = CURRENCY_SYMBOLS.get(currency, currency)
    if abs(amount) >= 10_000_000:
        return f"{symbol}{amount / 10_000_000:.2f}Cr"
    elif abs(amount) >= 100_000:
        return f"{symbol}{amount / 100_000:.2f}L"
    elif abs(amount) >= 1000:
        return f"{symbol}{amount / 1000:.1f}K"
    return f"{symbol}{amount:,.2f}"
