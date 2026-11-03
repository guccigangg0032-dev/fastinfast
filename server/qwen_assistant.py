"""Optional localhost-only Qwen adapter. Never expose Ollama directly to the web."""
import os
import re
import time
from collections import defaultdict, deque
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

app = FastAPI(title="Insurance information assistant", docs_url=None, redoc_url=None)
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
MODEL = os.environ.get("QWEN_MODEL", "qwen3:4b")
ALLOWED_ORIGINS = {"https://preview.asia", "https://calc.preview.asia"}
WINDOW = 60
MAX_PER_MINUTE = 12
requests_by_ip: dict[str, deque[float]] = defaultdict(deque)
SENSITIVE = re.compile(
    r"(?:\b\d{12}\b|(?:\d[\s-]?){16,19}|\+?7[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}|[\w.+-]+@[\w.-]+\.[a-z]{2,})",
    re.IGNORECASE,
)
SYSTEM_PROMPT = (
    "Ты русскоязычный информационный помощник сайта Fast Insurance Online, Казахстан. "
    "Помогаешь выбрать между KMIC MyHome (страхование имущества) и KupiPolis ОС ГПО ВТС "
    "(обязательное автострахование), объясняешь общие этапы. "
    "Ты не страховая компания, не имеешь доступа к Tumar, Freedom, государственным базам, "
    "SMS 1414, КДП, бонус-малус, договорам и платежам. "
    "Не выдумывай премии, результаты проверок, одобрения, статусы полисов, скидки и сроки. "
    "Для расчёта и подачи официальной заявки рекомендуй соответствующую "
    "страницу страховщика; не проси ИИН, номер телефона, банковские данные, пароли или SMS-коды. "
    "Пиши коротко, по делу, на русском."
)

class Message(BaseModel):
    message: str = Field(min_length=1, max_length=350)

@app.post("/api/assistant")
async def chat(payload: Message, request: Request) -> dict[str, str]:
    origin = request.headers.get("origin")
    if origin and origin not in ALLOWED_ORIGINS:
        raise HTTPException(403, "Origin not allowed")
    address = request.client.host if request.client else "unknown"
    hits = requests_by_ip[address]
    now = time.monotonic()
    while hits and hits[0] <= now - WINDOW:
        hits.popleft()
    if len(hits) >= MAX_PER_MINUTE:
        raise HTTPException(429, "Rate limit exceeded")
    hits.append(now)
    message = payload.message.strip()
    if SENSITIVE.search(message):
        raise HTTPException(400, "Do not submit personal or payment information")
    try:
        async with httpx.AsyncClient(timeout=22.0) as client:
            response = await client.post(OLLAMA_URL, json={
                "model": MODEL,
                "stream": False,
                "options": {"temperature": 0.2, "num_predict": 320},
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": message},
                ],
            })
            response.raise_for_status()
            data: dict[str, Any] = response.json()
        answer = data.get("message", {}).get("content", "")
        if not isinstance(answer, str) or not answer.strip():
            raise ValueError("Empty response")
        return {"answer": answer.strip()[:1600]}
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        raise HTTPException(503, "Qwen backend unavailable") from None
