from pydantic import BaseModel


class TokenPair(BaseModel):
    access: str
    refresh: str


class LoginRequest(BaseModel):
    username: str  # email or username; we use email
    password: str


class ResetInitRequest(BaseModel):
    email: str


class ResetConfirmRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
