"""Email schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.email_log import EmailStatus, EmailType


class EmailLogResponse(BaseModel):
    """Email log response schema."""
    id: int
    to_email: str
    to_name: Optional[str] = None
    subject: str
    body_preview: Optional[str] = None
    email_type: EmailType
    status: EmailStatus
    error_message: Optional[str] = None
    retry_count: int
    team_id: Optional[int] = None
    contact_id: Optional[int] = None
    sent_by: Optional[int] = None
    created_at: datetime
    sent_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class EmailLogListResponse(BaseModel):
    """Paginated email log list response."""
    items: List[EmailLogResponse]
    total: int
    page: int
    pages: int


class MassMailingCreate(BaseModel):
    """Schema for creating a mass mailing campaign."""
    name: str
    subject: str
    body: str
    target_type: str  # 'all_teams', 'approved_teams', 'pending_teams', 'season_teams'
    target_season_id: Optional[int] = None


class MassMailingResponse(BaseModel):
    """Mass mailing campaign response schema."""
    id: int
    name: str
    subject: str
    body: str
    target_type: str
    target_season_id: Optional[int] = None
    total_recipients: int
    sent_count: int
    failed_count: int
    is_sent: bool
    created_by: Optional[int] = None
    created_at: datetime
    sent_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MassMailingListResponse(BaseModel):
    """Paginated mass mailing list response."""
    items: List[MassMailingResponse]
    total: int
    page: int
    pages: int


class SendCustomEmailRequest(BaseModel):
    """Request to send custom email."""
    to: List[EmailStr]
    subject: str
    body: str
    html: Optional[str] = None

