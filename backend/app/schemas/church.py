from pydantic import BaseModel
from typing import Optional


class ChurchBase(BaseModel):
    name: str
    city: str
    whatsapp_phone: Optional[str] = None


class ChurchCreate(ChurchBase):
    pass


class ChurchUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    whatsapp_phone: Optional[str] = None


class ChurchRead(ChurchBase):
    id: int

    class Config:
        from_attributes = True
