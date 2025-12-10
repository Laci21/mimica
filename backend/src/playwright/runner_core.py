"""
Core Playwright runner utilities.

Provides functions to initialize Playwright, launch browsers,
and create contexts with video recording and tracing.
"""

import os
from pathlib import Path
from typing import Optional, Tuple
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright


class PlaywrightRunner:
    """
    Core runner for Playwright browser automation.
    
    Handles browser lifecycle, context creation with video recording,
    and page navigation.
    """
    
    def __init__(
        self,
        base_url: str,
        headless: bool = True,
        record_video: bool = True,
        capture_trace: bool = True,
        output_dir: str = "playwright-runs",
        run_id: str = "default"
    ):
        self.base_url = base_url
        self.headless = headless
        self.record_video = record_video
        self.capture_trace = capture_trace
        self.output_dir = output_dir
        self.run_id = run_id
        
        self.playwright: Optional[Playwright] = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        # Setup output directory
        self.run_dir = Path(output_dir) / run_id
        self.run_dir.mkdir(parents=True, exist_ok=True)
    
    async def start(self) -> Page:
        """
        Start Playwright, launch browser, and create context.
        
        Returns:
            The page object ready for automation
        """
        # Start Playwright
        self.playwright = await async_playwright().start()
        
        # Launch Chromium
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
            ]
        )
        
        # Create context with video recording
        context_options = {
            'viewport': {'width': 1280, 'height': 720},
            'ignore_https_errors': True,
        }
        
        if self.record_video:
            context_options['record_video_dir'] = str(self.run_dir)
            context_options['record_video_size'] = {'width': 1280, 'height': 720}
        
        self.context = await self.browser.new_context(**context_options)
        
        # Start tracing if requested
        if self.capture_trace:
            await self.context.tracing.start(
                screenshots=True,
                snapshots=True,
                sources=True
            )
        
        # Create page
        self.page = await self.context.new_page()
        
        return self.page
    
    async def stop(self):
        """
        Stop Playwright and close browser gracefully.
        
        Ensures video and trace are saved.
        """
        try:
            # Stop tracing and save
            if self.capture_trace and self.context:
                trace_path = self.run_dir / "trace.zip"
                await self.context.tracing.stop(path=str(trace_path))
            
            # Close context (triggers video save)
            if self.context:
                await self.context.close()
            
            # Close browser
            if self.browser:
                await self.browser.close()
            
            # Stop playwright
            if self.playwright:
                await self.playwright.stop()
        except Exception as e:
            print(f"Error during cleanup: {e}")
    
    async def navigate(self, path: str = "") -> None:
        """
        Navigate to a URL.
        
        Args:
            path: Path to append to base URL (e.g., "/lab?version=v1")
        """
        if not self.page:
            raise RuntimeError("Page not initialized. Call start() first.")
        
        url = f"{self.base_url}{path}"
        await self.page.goto(url, wait_until="networkidle", timeout=30000)
    
    async def wait_for_selector(self, selector: str, timeout: int = 5000):
        """Wait for a selector to be visible"""
        if not self.page:
            raise RuntimeError("Page not initialized")
        return await self.page.wait_for_selector(selector, state="visible", timeout=timeout)
    
    async def click(self, selector: str, timeout: int = 5000):
        """Click an element"""
        if not self.page:
            raise RuntimeError("Page not initialized")
        await self.page.click(selector, timeout=timeout)
    
    async def fill(self, selector: str, value: str, timeout: int = 5000):
        """Fill an input field"""
        if not self.page:
            raise RuntimeError("Page not initialized")
        await self.page.fill(selector, value, timeout=timeout)
    
    async def select_option(self, selector: str, value: str, timeout: int = 5000):
        """Select an option from a dropdown"""
        if not self.page:
            raise RuntimeError("Page not initialized")
        await self.page.select_option(selector, value, timeout=timeout)
    
    def get_video_path(self) -> Optional[Path]:
        """Get the path to the recorded video"""
        # Video files are named by Playwright as <uuid>.webm
        # We need to find it in the run directory
        video_files = list(self.run_dir.glob("*.webm"))
        if video_files:
            # Rename to standard name for easier access
            standard_path = self.run_dir / "video.webm"
            if not standard_path.exists():
                video_files[0].rename(standard_path)
            return standard_path
        return None
    
    def get_trace_path(self) -> Optional[Path]:
        """Get the path to the trace file"""
        trace_path = self.run_dir / "trace.zip"
        return trace_path if trace_path.exists() else None

