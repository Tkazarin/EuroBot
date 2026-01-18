"""Email utilities."""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
from typing import Optional, List
from datetime import datetime
import html as html_module
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings


def create_html_template(body: str, subject: str) -> str:
    """Create a proper HTML email template from plain text."""
    # Escape HTML and convert newlines to <br>
    escaped_body = html_module.escape(body).replace('\n', '<br>')
    
    return f"""
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html_module.escape(subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                Евробот Россия
                            </h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 20px;">
                                {html_module.escape(subject)}
                            </h2>
                            <div style="color: #374151; font-size: 16px; line-height: 1.6;">
                                {escaped_body}
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                С уважением,<br>
                                <strong>Команда Евробот Россия</strong>
                            </p>
                            <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                                Это письмо отправлено автоматически. Если вы получили его по ошибке, просто проигнорируйте.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


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
            # Create message with proper headers
            message = MIMEMultipart("alternative")
            message["From"] = settings.FROM_EMAIL
            message["To"] = recipient
            message["Subject"] = subject
            message["Date"] = formatdate(localtime=True)
            message["Message-ID"] = make_msgid(domain=settings.FROM_EMAIL.split('@')[1] if '@' in settings.FROM_EMAIL else 'eurobot.ru')
            message["X-Mailer"] = "Eurobot Russia Mailer"
            message["MIME-Version"] = "1.0"
            
            # Add plain text
            message.attach(MIMEText(body, "plain", "utf-8"))
            
            # Add HTML - use provided or generate from template
            html_content = html if html else create_html_template(body, subject)
            message.attach(MIMEText(html_content, "html", "utf-8"))
            
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




