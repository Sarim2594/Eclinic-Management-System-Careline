from pydantic import BaseModel
from typing import List, Optional

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class CompanyCreate(BaseModel):
    name: str
    email: str
    contact: str
    registration_number: str
    address: str

class AdminCreate(BaseModel):
    name: str
    username: str
    email: str
    password: str
    contact: str
    company_id: int
    assigned_regions: List[str]

class AdminRegionsUpdate(BaseModel):
    assigned_regions: List[str]

class CompanyStatusUpdate(BaseModel):
    status: str