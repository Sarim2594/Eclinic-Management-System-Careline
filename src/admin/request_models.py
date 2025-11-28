from pydantic import BaseModel
from typing import Optional

class PasswordChangeRequest(BaseModel):
    admin_id: int
    new_password: str
    reason: str

class ContactChangeRequest(BaseModel):
    admin_id: int
    new_contact: str
    reason: str