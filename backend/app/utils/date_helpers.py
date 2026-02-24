"""
Date helper utilities.
"""
from datetime import datetime, date, timedelta
from typing import Tuple


def get_days_together(start_date: date) -> int:
    """Calculate the number of days since the relationship started."""
    today = date.today()
    return (today - start_date).days


def get_relationship_time(start_date: date) -> dict:
    """
    Calculate the relationship time in years, months, days, hours.
    """
    now = datetime.now()
    start = datetime.combine(start_date, datetime.min.time())
    
    delta = now - start
    
    # Calculate years, months, days
    years = now.year - start.year
    months = now.month - start.month
    days = now.day - start.day
    
    if days < 0:
        months -= 1
        # Get days in previous month
        prev_month = now.month - 1 if now.month > 1 else 12
        prev_year = now.year if now.month > 1 else now.year - 1
        days_in_prev_month = (date(prev_year, prev_month + 1, 1) - date(prev_year, prev_month, 1)).days
        days += days_in_prev_month
    
    if months < 0:
        years -= 1
        months += 12
    
    # Calculate hours
    hours = delta.seconds // 3600
    
    return {
        "years": years,
        "months": months,
        "days": days,
        "hours": hours,
        "total_days": delta.days
    }


def get_next_anniversary(anniversary_date: date) -> Tuple[int, date]:
    """
    Calculate days until the next anniversary.
    Returns (days_until, next_anniversary_date).
    """
    today = date.today()
    
    # Get this year's anniversary
    this_year_anniversary = date(today.year, anniversary_date.month, anniversary_date.day)
    
    # If it has passed this year, get next year's
    if this_year_anniversary < today:
        next_anniversary = date(today.year + 1, anniversary_date.month, anniversary_date.day)
    else:
        next_anniversary = this_year_anniversary
    
    days_until = (next_anniversary - today).days
    return days_until, next_anniversary


def get_next_birthday(birthday: date) -> Tuple[int, date]:
    """
    Calculate days until the next birthday.
    Returns (days_until, next_birthday_date).
    """
    return get_next_anniversary(birthday)


def is_special_date(check_date: date) -> dict:
    """
    Check if a date is special (Valentine's Day, Christmas, New Year, etc.).
    """
    month = check_date.month
    day = check_date.day
    
    special_dates = {
        (2, 14): {"name": "Valentine's Day", "type": "valentine"},
        (12, 25): {"name": "Christmas", "type": "christmas"},
        (12, 31): {"name": "New Year's Eve", "type": "new_year"},
        (1, 1): {"name": "New Year's Day", "type": "new_year"},
    }
    
    return special_dates.get((month, day), None)


def get_date_range_description(start_date: date, end_date: date) -> str:
    """
    Get a human-readable description of a date range.
    """
    if start_date == end_date:
        return start_date.strftime("%d %B %Y")
    
    return f"{start_date.strftime('%d %B %Y')} - {end_date.strftime('%d %B %Y')}"