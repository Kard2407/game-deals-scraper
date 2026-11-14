"""Rate limiting y control de concurrencia por dominio."""
import threading
import time
from urllib.parse import urlparse

class DomainRateLimiter:
    """Controla pausas mínimas entre peticiones al mismo dominio para evitar 429/bloqueos."""
    def __init__(self, default_delay: float = 0.5):
        self.default_delay = default_delay
        self._lock = threading.Lock()
        self._last_call = {}
        self._delays = {
            "store.steampowered.com": 0.4,
            "cheapshark.com": 0.2,
            "metacritic.com": 0.8,
            "howlongtobeat.com": 0.5,
        }

    def wait(self, url_or_domain: str):
        if "://" in url_or_domain:
            domain = urlparse(url_or_domain).netloc.lower()
        else:
            domain = url_or_domain.lower()

        delay = self._delays.get(domain, self.default_delay)

        with self._lock:
            now = time.time()
            last = self._last_call.get(domain, 0.0)
            elapsed = now - last
            if elapsed < delay:
                time.sleep(delay - elapsed)
            self._last_call[domain] = time.time()

# Instancia global por proceso
limiter = DomainRateLimiter()
