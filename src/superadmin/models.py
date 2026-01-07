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
    subscription_plan: str = 'purchase'

class AdminCreate(BaseModel):
    name: str
    username: str
    email: str
    password: str
    contact: str
    company_id: int
    assigned_region_ids: List[int]

class AdminRegionsUpdate(BaseModel):
    assigned_region_ids: List[int]

class CompanyStatusUpdate(BaseModel):
    status: str