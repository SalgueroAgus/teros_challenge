import os
from functools import lru_cache

from dotenv import load_dotenv
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
