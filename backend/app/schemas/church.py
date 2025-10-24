from pydantic import BaseModel


class ChurchBase(BaseModel):
    name: str
    city: str


class ChurchCreate(ChurchBase):
    pass


class ChurchRead(ChurchBase):
    id: int

    class Config:
        from_attributes = True
