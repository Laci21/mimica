from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable


def add_elapsed_to_events_file(events_file: Path) -> None:
    """
    Add an `elapsed` field (milliseconds since first event in the file)
    to every event in a single `events.json` file.
    """
    if not events_file.is_file():
        raise FileNotFoundError(f"events.json not found: {events_file}")

    with events_file.open("r", encoding="utf-8") as f:
        events: Any = json.load(f)

    if not isinstance(events, list) or not events:
        # Nothing to do for non-list or empty files
        return

    first_ts = events[0].get("timestamp")
    if first_ts is None:
        # Cannot compute elapsed without a baseline
        return

    for event in events:
        ts = event.get("timestamp")
        if ts is None:
            # Skip malformed entries
            continue
        try:
            elapsed_sec = round(ts - first_ts, 3)
        except TypeError:
            # If timestamp is not numeric, skip
            continue
        event["elapsed"] = elapsed_sec

    with events_file.open("w", encoding="utf-8") as f:
        json.dump(events, f, indent=2)
        f.write("\n")


def iter_events_files(playwright_runs_dir: Path) -> Iterable[Path]:
    """
    Yield all `events.json` files in direct subdirectories of `playwright-runs`.
    """
    for child in playwright_runs_dir.iterdir():
        if not child.is_dir():
            continue
        events_file = child / "events.json"
        if events_file.is_file():
            yield events_file


def add_elapsed_to_all_events(playwright_runs_dir: str | Path | None = None) -> None:
    """
    Process all `events.json` files under the `playwright-runs` directory,
    adding an `elapsed` field (milliseconds since first event in each file)
    to every event.
    """
    if playwright_runs_dir is None:
        # Default to `<backend_root>/playwright-runs`
        playwright_runs_dir = Path(__file__).parent.parent / "playwright-runs"
    else:
        playwright_runs_dir = Path(playwright_runs_dir)

    if not playwright_runs_dir.exists():
        raise FileNotFoundError(f"playwright-runs directory not found: {playwright_runs_dir}")

    for events_file in iter_events_files(playwright_runs_dir):
        add_elapsed_to_events_file(events_file)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Add `elapsed` (ms since first event) to events.json files under playwright-runs."
    )
    parser.add_argument(
        "--runs-dir",
        type=str,
        default=None,
        help="Path to playwright-runs directory (defaults to `<backend_root>/playwright-runs`).",
    )

    args = parser.parse_args()
    add_elapsed_to_all_events(args.runs_dir)


