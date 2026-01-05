"""Email utilities."""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from typing import Optional, List
from datetime import datetime
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings


async def send_email(
    to: str | List[str],
    subject: str,
    body: str,
    html: Optional[str] = None,
    db: Optional[AsyncSession] = None,
    email_type: str = "custom",
    team_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    sent_by: Optional[int] = None
) -> bool:
    """Send email asynchronously with optional database logging."""
    from app.models.email_log import EmailLog, EmailStatus, EmailType
    
    to_list = [to] if isinstance(to, str) else to
    success = True
    
    for recipient in to_list:
        # Create log entry if db session provided
        log_entry = None
        if db:
            try:
                log_entry = EmailLog(
                    to_email=recipient,
                    subject=subject,
                    body_preview=body[:500] if body else None,
                    email_type=EmailType(email_type) if email_type in [e.value for e in EmailType] else EmailType.custom,
                    status=EmailStatus.pending,
                    team_id=team_id,
                    contact_id=contact_id,
                    sent_by=sent_by
                )
                db.add(log_entry)
                await db.flush()  # Get ID without committing
            except Exception as e:
                logger.error(f"Failed to create email log: {e}")
        
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning(f"Email not configured, skipping send to {recipient}")
            if log_entry:
                log_entry.status = EmailStatus.failed
                log_entry.error_message = "SMTP not configured"
            success = False
            continue
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["From"] = settings.FROM_EMAIL
            message["To"] = recipient
            message["Subject"] = subject
            
            # Add plain text
            message.attach(MIMEText(body, "plain", "utf-8"))
            
            # Add HTML if provided
            if html:
                message.attach(MIMEText(html, "html", "utf-8"))
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                use_tls=True
            )
            
            logger.info(f"Email sent to {recipient}")
            
            if log_entry:
                log_entry.status = EmailStatus.sent
                log_entry.sent_at = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {e}")
            if log_entry:
                log_entry.status = EmailStatus.failed
                log_entry.error_message = str(e)
            success = False
    
    # Commit all log entries
    if db:
        try:
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to commit email logs: {e}")
    
    return success


async def send_registration_confirmation(
    team_name: str, 
    email: str,
    db: Optional[AsyncSession] = None,
    team_id: Optional[int] = None
) -> bool:
    """Send registration confirmation email."""
    subject = f"Регистрация команды {team_name} - Евробот"
    body = f"""
Здравствуйте!

Ваша команда "{team_name}" успешно зарегистрирована на соревнования Евробот.

Мы свяжемся с вами для подтверждения участия.

С уважением,
Команда Евробот
    """
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif;">
        <h2>Регистрация команды {team_name}</h2>
        <p>Здравствуйте!</p>
        <p>Ваша команда <strong>"{team_name}"</strong> успешно зарегистрирована на соревнования Евробот.</p>
        <p>Мы свяжемся с вами для подтверждения участия.</p>
        <hr>
        <p>С уважением,<br>Команда Евробот</p>
    </body>
    </html>
    """
    
    return await send_email(
        email, subject, body, html,
        db=db,
        email_type="registration_confirmation",
        team_id=team_id
    )


async def send_contact_notification(
    name: str, 
    email: str, 
    topic: str, 
    message_text: str,
    db: Optional[AsyncSession] = None,
    contact_id: Optional[int] = None
) -> bool:
    """Send notification about new contact message to admin."""
    admin_email = settings.ADMIN_EMAIL
    subject = f"Новое сообщение: {topic} - от {name}"
    body = f"""
Новое сообщение с сайта Евробот

От: {name} ({email})
Тема: {topic}

Сообщение:
{message_text}
    """
    
    return await send_email(
        admin_email, subject, body,
        db=db,
        email_type="contact_notification",
        contact_id=contact_id
    )


async def send_team_status_update(
    team_name: str,
    email: str,
    new_status: str,
    db: Optional[AsyncSession] = None,
    team_id: Optional[int] = None,
    admin_id: Optional[int] = None
) -> bool:
    """Send team status update notification."""
    status_messages = {
        "approved": ("Заявка одобрена", "Ваша заявка на участие в соревнованиях Евробот была одобрена!"),
        "rejected": ("Заявка отклонена", "К сожалению, ваша заявка на участие в соревнованиях Евробот была отклонена."),
        "withdrawn": ("Заявка отозвана", "Ваша заявка на участие в соревнованиях Евробот была отозвана.")
    }
    
    title, message = status_messages.get(new_status, ("Статус заявки изменён", f"Статус вашей заявки изменён на: {new_status}"))
    
    subject = f"{title} - {team_name} - Евробот"
    body = f"""
Здравствуйте!

{message}

Команда: {team_name}

При возникновении вопросов обращайтесь на {settings.ADMIN_EMAIL}

С уважением,
Команда Евробот
    """
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif;">
        <h2>{title}</h2>
        <p>Здравствуйте!</p>
        <p>{message}</p>
        <p><strong>Команда:</strong> {team_name}</p>
        <p>При возникновении вопросов обращайтесь на <a href="mailto:{settings.ADMIN_EMAIL}">{settings.ADMIN_EMAIL}</a></p>
        <hr>
        <p>С уважением,<br>Команда Евробот</p>
    </body>
    </html>
    """
    
    return await send_email(
        email, subject, body, html,
        db=db,
        email_type="team_status_update",
        team_id=team_id,
        sent_by=admin_id
    )




