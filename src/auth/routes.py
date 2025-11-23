from fastapi import APIRouter, status, HTTPException
from fastapi.requests import Request
from src.auth.services import hash_password, get_user_and_profile_data
from pydantic import BaseModel
import traceback

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

router = APIRouter()

@router.post("/login")
def login_endpoint(request: Request, credentials: LoginRequest):
    """
    Authenticate user with username/email and password.
    """
    try:
        # Access the database object from the FastAPI state
        db = request.app.state.db
        
        password_hash = hash_password(credentials.password)
        
        # Pass the database connection to the service layer
        response_data = get_user_and_profile_data(db, credentials.username_or_email, password_hash)
        
        return response_data
            
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal Server Error: {str(e)}")