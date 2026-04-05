import sys
import logging
from pathlib import Path

from fastapi import FastAPI

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.routes.reviews import router as review_router

access_logger = logging.getLogger("uvicorn.access")
access_logger.disabled = True
access_logger.propagate = False
access_logger.setLevel(logging.CRITICAL)

app = FastAPI()

app.include_router(review_router)
