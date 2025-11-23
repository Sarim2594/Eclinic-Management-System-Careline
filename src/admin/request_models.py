from pydantic import BaseModel
from typing import Optional

class PasswordChangeRequest(BaseModel):
    """Schema for an Admin's request to change their password."""
    admin_id: int
    new_password: str
    reason: str

class ContactChangeRequest(BaseModel):
    """Schema for an Admin's request to change their contact information."""
    admin_id: int
    new_contact: str
    reason: str