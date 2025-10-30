from typing import List, Any
from pydantic import field_validator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

    database_url: str = "postgresql+psycopg2://ccb:ccb@localhost:5432/ccb"
    jwt_secret: str = "change_me"
    jwt_alg: str = "HS256"
    access_token_expires_min: int = 30
    refresh_token_expires_min: int = 43200
    cors_origins_raw: str | None = Field(default=None, alias="CORS_ORIGINS")
    
    # Admin bootstrap
    admin_email: str | None = None
    admin_password: str | None = None
    
    # Email/SMTP settings
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    email_from: str | None = None
    email_from_name: str = "CNS CCB Santa Isabel"

    @property
    def cors_origins(self) -> List[str]:
        v = self.cors_origins_raw
        if v is None:
            return ["http://localhost:5173"]
        s = v.strip()
        if not s:
            return ["http://localhost:5173"]
        if s.startswith("["):
            import json
            try:
                arr = json.loads(s)
                if isinstance(arr, list):
                    return [str(x) for x in arr]
            except Exception:
                pass
        return [piece.strip() for piece in s.split(",") if piece.strip()]


settings = Settings()
