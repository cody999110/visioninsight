from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "VisionInsight API"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173"
    storage_dir: Path = Path(__file__).resolve().parent.parent / "storage" / "datasets"
    mgmt_config_dir: Path = Path(__file__).resolve().parent.parent / "storage" / "mgmt_configs"
    cleaning_config_dir: Path = Path(__file__).resolve().parent.parent / "storage" / "cleaning_configs"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
