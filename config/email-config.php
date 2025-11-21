<?php
/*
==============================================
EMAIL CONFIGURATION
==============================================
Update these settings with your actual SMTP configuration
==============================================
*/

return [
    // SMTP Configuration for StormerHost
    'smtp_host' => 'mail.prelyct.com',         // StormerHost SMTP server
    'smtp_port' => 587,                        // StormerHost SMTP port (587 for TLS)
    'smtp_encryption' => 'tls',                // TLS encryption for StormerHost
    'smtp_username' => 'info@prelyct.com',     // Your StormerHost email address
    'smtp_password' => 'YOUR_EMAIL_PASSWORD',  // Your StormerHost email password
    
    // Email Settings
    'from_email' => 'info@prelyct.com',        // From email address
    'from_name' => 'Prelyct Contact Form',     // From name
    'to_email' => 'info@prelyct.com',          // Recipient email address
    'to_name' => 'Prelyct Team',               // Recipient name
    
    // Additional Settings
    'reply_to' => true,                        // Enable reply-to functionality
    'html_email' => true,                      // Send HTML emails
    'debug_mode' => false,                     // Disable debug mode for production
];
?>
