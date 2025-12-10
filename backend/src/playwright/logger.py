"""
Event logger for Playwright runs.

Handles writing run metadata and event logs to disk.
"""

import json
import os
from pathlib import Path
from typing import Optional
from .models import PlaywrightEvent, PlaywrightRunMetadata


class EventLogger:
    """
    Logs Playwright events to structured JSON files.
    
    Creates a run directory with:
    - metadata.json: Run metadata
    - events.json: Array of events
    """
    
    def __init__(self, metadata: PlaywrightRunMetadata, output_dir: str = "playwright-runs"):
        self.metadata = metadata
        self.events: list[PlaywrightEvent] = []
        
        # Create run directory
        self.run_dir = Path(output_dir) / metadata.run_id
        self.run_dir.mkdir(parents=True, exist_ok=True)
        
        # Set file paths
        self.metadata_path = self.run_dir / "metadata.json"
        self.events_path = self.run_dir / "events.json"
        
        # Initialize metadata file
        self._write_metadata()
    
    def _write_metadata(self):
        """Write current metadata to file"""
        with open(self.metadata_path, 'w') as f:
            json.dump(self.metadata.to_dict(), f, indent=2)
    
    def _write_events(self):
        """Write current events to file"""
        with open(self.events_path, 'w') as f:
            json.dump([e.to_dict() for e in self.events], f, indent=2)
    
    def log_event(self, event: PlaywrightEvent):
        """
        Log a single event and update metadata with event count.
        
        Args:
            event: The event to log
        """
        self.events.append(event)
        self._write_events()
        
        # Update metadata with current event count
        if hasattr(self.metadata, 'metadata') and isinstance(self.metadata.metadata, dict):
            self.metadata.metadata['eventCount'] = len(self.events)
            self._write_metadata()
    
    def update_metadata(self, **kwargs):
        """
        Update metadata fields.
        
        Args:
            **kwargs: Fields to update on metadata
        """
        for key, value in kwargs.items():
            if hasattr(self.metadata, key):
                setattr(self.metadata, key, value)
        self._write_metadata()
    
    def get_run_dir(self) -> Path:
        """Get the run directory path"""
        return self.run_dir
    
    def get_video_path(self) -> Optional[Path]:
        """Get the video file path if it exists"""
        video_path = self.run_dir / "video.webm"
        return video_path if video_path.exists() else None
    
    def get_trace_path(self) -> Optional[Path]:
        """Get the trace file path if it exists"""
        trace_path = self.run_dir / "trace.zip"
        return trace_path if trace_path.exists() else None
    
    def save_events(self) -> Path:
        """
        Save events to file (final save).
        
        Returns:
            Path to the events file
        """
        self._write_events()
        return self.events_path
    
    def save_metadata(self, metadata: Optional[PlaywrightRunMetadata] = None) -> Path:
        """
        Save metadata to file (final save).
        
        Args:
            metadata: Optional updated metadata object. If provided, replaces current metadata.
        
        Returns:
            Path to the metadata file
        """
        if metadata is not None:
            self.metadata = metadata
        self._write_metadata()
        return self.metadata_path

