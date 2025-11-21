<?php
/*
==============================================
EMAIL CONFIGURATION EXAMPLE
==============================================
Copy this file to email-config.php and update with your actual SMTP settings
==============================================
*/

return [
    // SMTP Configuration
    'smtp_host' => 'smtp.gmail.com',           // Your SMTP server hostname
    'smtp_port' => 587,                        // SMTP port (587 for TLS, 465 for SSL)
    'smtp_encryption' => 'tls',                // Encryption type: 'tls' or 'ssl'
    'smtp_username' => 'your-email@gmail.com', // Your SMTP username
    'smtp_password' => 'your-app-password',    // Your SMTP password or app password
    
    // Email Settings
    'from_email' => 'noreply@prelyct.com',     // From email address
    'from_name' => 'Prelyct Contact Form',     // From name
    'to_email' => 'hello@prelyct.com',         // Recipient email address
    'to_name' => 'Prelyct Team',               // Recipient name
    
    // Additional Settings
    'reply_to' => true,                        // Enable reply-to functionality
    'html_email' => true,                      // Send HTML emails
    'debug_mode' => false,                     // Enable SMTP debug mode
];

/*
==============================================
SMTP PROVIDER EXAMPLES
==============================================

Gmail:
- smtp_host: smtp.gmail.com
- smtp_port: 587
- smtp_encryption: tls
- smtp_username: your-email@gmail.com
- smtp_password: your-app-password (not your regular password)

Outlook/Hotmail:
- smtp_host: smtp-mail.outlook.com
- smtp_port: 587
- smtp_encryption: tls
- smtp_username: your-email@outlook.com
- smtp_password: your-password

Yahoo:
- smtp_host: smtp.mail.yahoo.com
- smtp_port: 587
- smtp_encryption: tls
- smtp_username: your-email@yahoo.com
- smtp_password: your-app-password

Custom SMTP:
- smtp_host: mail.yourdomain.com
- smtp_port: 587 (or 465 for SSL)
- smtp_encryption: tls (or ssl)
- smtp_username: your-email@yourdomain.com
- smtp_password: your-password

==============================================
SETUP INSTRUCTIONS
==============================================

1. Copy this file to email-config.php:
   cp config/email-config.example.php config/email-config.php

2. Update the configuration with your actual SMTP settings

3. For Gmail, you'll need to:
   - Enable 2-factor authentication
   - Generate an app password
   - Use the app password instead of your regular password

4. Test the configuration by submitting the contact form

5. Check the logs in backend/submissions.log for any errors

==============================================
SECURITY NOTES
==============================================

- Never commit email-config.php to version control
- Use strong passwords for SMTP accounts
- Consider using environment variables for sensitive data
- Regularly rotate SMTP passwords
- Monitor email logs for suspicious activity

==============================================
*/
?>
