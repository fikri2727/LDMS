"""Display labels used by server-side logic (Excel import matching, reports). Ported from lib/labels.ts."""

DESIGNATION_LABELS = {
    "EXECUTIVE": "Executive",
    "MANAGER": "Manager",
    "NON_EXECUTIVE": "Non-Executive",
    "CONTRACT": "Contract",
    "TRAINEE": "Trainee",
}

GENDER_LABELS = {"MALE": "Male", "FEMALE": "Female"}

ROLE_LABELS = {"ADMIN": "Admin", "CLERK": "Clerk", "STAFF": "Staff", "CREATOR": "Creator"}

STATUS_LABELS = {"ACTIVE": "Active", "RESIGN": "Resigned"}

FUNCTION_LABELS = {
    "BUSINESS": "Business",
    "DIGITAL": "Digital",
    "LEADERSHIP": "Leadership",
    "PERSONAL_EFFECTIVENESS": "Personal Effectiveness",
}

TRAINER_TYPE_LABELS = {"INTERNAL": "Internal", "EXTERNAL": "External"}

# Valid percent range [min, max] for each PME rating band.
RATING_BAND_RANGES = {
    "EXCELLENT": (91, 100),
    "VERY_GOOD": (80, 89),
    "GOOD": (70, 79),
    "SATISFACTORY": (60, 69),
    "FAIR": (50, 59),
    "POOR": (0, 49),
}

# PME-eligible designations — matches the legacy app's Executive/Manager-only PME rule.
PME_ELIGIBLE_DESIGNATIONS = {"EXECUTIVE", "MANAGER"}


def enum_from_label(labels: dict[str, str], raw: str) -> str | None:
    """Accepts either the enum key ("NON_EXECUTIVE") or its label ("Non-Executive"), case-insensitive."""
    needle = raw.strip().upper()
    if not needle:
        return None
    for key, label in labels.items():
        if key == needle or label.upper() == needle:
            return key
    return None

RATING_BAND_SHORT_LABELS = {
    "EXCELLENT": "Excellent (>90%)",
    "VERY_GOOD": "Very Good (80-89%)",
    "GOOD": "Good (70-79%)",
    "SATISFACTORY": "Satisfactory (60-69%)",
    "FAIR": "Fair (50-59%)",
    "POOR": "Poor (<50%)",
}
