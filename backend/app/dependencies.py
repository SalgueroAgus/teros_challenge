import os
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import Header, HTTPException
from openai import OpenAI

from supabase import Client, create_client

load_dotenv()


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SECRET_KEY"],
    )


@lru_cache(maxsize=1)
def get_openai() -> OpenAI:
    return OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = os.environ.get("API_KEY")
    if not expected:
        return  # key not configured — open in local dev
    if x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")
