from __future__ import annotations
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password
        self.smtp_use_tls = settings.smtp_use_tls
        self.email_from = settings.email_from or settings.smtp_user
        self.email_from_name = settings.email_from_name
    
    def _is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return bool(
            self.smtp_host and 
            self.smtp_user and 
            self.smtp_password and 
            self.email_from
        )
    
    def send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str, 
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email"""
        if not self._is_configured():
            logger.warning("Email service not configured, skipping email send")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.email_from_name} <{self.email_from}>"
            msg['To'] = to_email
            
            # Add text version if provided
            if text_content:
                text_part = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(text_part)
            
            # Add HTML version
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_password_reset_email(self, to_email: str, user_name: str, reset_token: str) -> bool:
        """Send password reset email"""
        subject = "Redefinição de Senha - CNS CCB Santa Isabel"
        
        # Create reset URL - in production this would be your domain
        reset_url = f"https://cns.admsiga.org.br/reset-confirm?token={reset_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Redefinição de Senha</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }}
                .button {{ background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }}
                .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }}
                .warning {{ background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>CNS CCB Santa Isabel</h1>
                    <h2>Redefinição de Senha</h2>
                </div>
                <div class="content">
                    <p>Olá <strong>{user_name}</strong>,</p>
                    
                    <p>Você solicitou a redefinição da sua senha no sistema CNS. Clique no botão abaixo para criar uma nova senha:</p>
                    
                    <p style="text-align: center;">
                        <a href="{reset_url}" class="button">Redefinir Minha Senha</a>
                    </p>
                    
                    <div class="warning">
                        <strong>⚠️ Importante:</strong>
                        <ul>
                            <li>Este link é válido por <strong>24 horas</strong></li>
                            <li>Se você não solicitou esta redefinição, ignore este email</li>
                            <li>Não compartilhe este link com outras pessoas</li>
                        </ul>
                    </div>
                    
                    <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
                    <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
                        {reset_url}
                    </p>
                    
                    <div class="footer">
                        <p>Email enviado automaticamente em {datetime.now().strftime('%d/%m/%Y às %H:%M')}</p>
                        <p>CNS CCB Santa Isabel - Sistema de Pedidos</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        CNS CCB Santa Isabel - Redefinição de Senha
        
        Olá {user_name},
        
        Você solicitou a redefinição da sua senha no sistema CNS.
        
        Para criar uma nova senha, acesse o link abaixo:
        {reset_url}
        
        IMPORTANTE:
        - Este link é válido por 24 horas
        - Se você não solicitou esta redefinição, ignore este email
        - Não compartilhe este link com outras pessoas
        
        Email enviado automaticamente em {datetime.now().strftime('%d/%m/%Y às %H:%M')}
        CNS CCB Santa Isabel - Sistema de Pedidos
        """
        
        return self.send_email(to_email, subject, html_content, text_content)


# Global email service instance
email_service = EmailService()