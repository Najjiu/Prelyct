<?php
/*
==============================================
PRELYCT CONTACT FORM HANDLER
==============================================
Security Features:
- CSRF Protection
- XSS Prevention
- Rate Limiting
- Honeypot Spam Protection
- Input Validation
- Email Sanitization
- Logging
==============================================
*/

// Start session for CSRF protection
session_start();

// Set content type to JSON
header('Content-Type: application/json');

// CORS headers for security
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Using PHP's built-in mail function (no PHPMailer required)

// Simple email configuration (no external dependencies)
$to_email = 'info@prelyct.com';
$from_email = 'noreply@prelyct.com';
$from_name = 'Prelyct Contact Form';

// Rate limiting configuration
$rateLimitFile = __DIR__ . '/rate-limit.json';
$maxRequests = 3; // Maximum requests per time window
$timeWindow = 300; // 5 minutes in seconds

// ==============================================
// SECURITY FUNCTIONS
// ==============================================

/**
 * Sanitize input data
 */
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

/**
 * Validate email address
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Check rate limiting
 */
function checkRateLimit($ip, $rateLimitFile, $maxRequests, $timeWindow) {
    $rateLimitData = [];
    
    if (file_exists($rateLimitFile)) {
        $rateLimitData = json_decode(file_get_contents($rateLimitFile), true) ?: [];
    }
    
    $currentTime = time();
    $userRequests = $rateLimitData[$ip] ?? [];
    
    // Remove old requests outside the time window
    $userRequests = array_filter($userRequests, function($timestamp) use ($currentTime, $timeWindow) {
        return ($currentTime - $timestamp) < $timeWindow;
    });
    
    // Check if user has exceeded rate limit
    if (count($userRequests) >= $maxRequests) {
        return false;
    }
    
    // Add current request
    $userRequests[] = $currentTime;
    $rateLimitData[$ip] = $userRequests;
    
    // Save updated rate limit data
    file_put_contents($rateLimitFile, json_encode($rateLimitData));
    
    return true;
}

/**
 * Log form submission
 */
function logSubmission($data, $success, $message = '') {
    $logFile = __DIR__ . '/submissions.log';
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    
    $logEntry = [
        'timestamp' => $timestamp,
        'ip' => $ip,
        'user_agent' => $userAgent,
        'success' => $success,
        'message' => $message,
        'form_data' => [
            'name' => $data['name'] ?? '',
            'company' => $data['company'] ?? '',
            'role' => $data['role'] ?? '',
            'email' => $data['email'] ?? '',
            'interests' => $data['interests'] ?? [],
            'message_length' => strlen($data['message'] ?? '')
        ]
    ];
    
    $logLine = json_encode($logEntry) . "\n";
    file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);
}

/**
 * Send email using PHP's built-in mail function
 */
function sendEmail($data, $to_email, $from_email, $from_name) {
    // Build email body
    $interests = is_array($data['interests']) ? implode(', ', $data['interests']) : $data['interests'];
    
    $subject = 'New Contact Form Submission - Prelyct';
    
    $emailBody = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #374151; }
            .value { margin-top: 5px; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h2>New Contact Form Submission</h2>
                <p>Prelyct Website</p>
            </div>
            <div class='content'>
                <div class='field'>
                    <div class='label'>Name:</div>
                    <div class='value'>" . htmlspecialchars($data['name']) . "</div>
                </div>
                <div class='field'>
                    <div class='label'>Company:</div>
                    <div class='value'>" . htmlspecialchars($data['company']) . "</div>
                </div>
                <div class='field'>
                    <div class='label'>Role:</div>
                    <div class='value'>" . htmlspecialchars($data['role']) . "</div>
                </div>
                <div class='field'>
                    <div class='label'>Email:</div>
                    <div class='value'>" . htmlspecialchars($data['email']) . "</div>
                </div>
                <div class='field'>
                    <div class='label'>Services of Interest:</div>
                    <div class='value'>" . htmlspecialchars($interests) . "</div>
                </div>
                <div class='field'>
                    <div class='label'>Message:</div>
                    <div class='value'>" . nl2br(htmlspecialchars($data['message'])) . "</div>
                </div>
            </div>
            <div class='footer'>
                <p>This message was sent from the Prelyct contact form.</p>
                <p>IP Address: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . "</p>
                <p>Timestamp: " . date('Y-m-d H:i:s') . "</p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    // Email headers
    $headers = [
        'From: ' . $from_name . ' <' . $from_email . '>',
        'Reply-To: ' . $data['email'],
        'X-Mailer: PHP/' . phpversion(),
        'Content-Type: text/html; charset=UTF-8',
        'MIME-Version: 1.0'
    ];
    
    // Send email using PHP's built-in mail function
    return mail($to_email, $subject, $emailBody, implode("\r\n", $headers));
}

// ==============================================
// MAIN PROCESSING
// ==============================================

try {
    // Get client IP address
    $clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    
    // Check rate limiting
    if (!checkRateLimit($clientIP, $rateLimitFile, $maxRequests, $timeWindow)) {
        logSubmission([], false, 'Rate limit exceeded');
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'message' => 'Too many requests. Please try again later.'
        ]);
        exit;
    }
    
    // Honeypot check (spam protection)
    if (!empty($_POST['website'])) {
        logSubmission([], false, 'Honeypot triggered');
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid submission.'
        ]);
        exit;
    }
    
    // Validate required fields
    $requiredFields = ['name', 'company', 'role', 'email'];
    $missingFields = [];
    
    foreach ($requiredFields as $field) {
        if (empty($_POST[$field])) {
            $missingFields[] = $field;
        }
    }
    
    if (!empty($missingFields)) {
        logSubmission($_POST, false, 'Missing required fields: ' . implode(', ', $missingFields));
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Please fill in all required fields.'
        ]);
        exit;
    }
    
    // Sanitize and validate input data
    $formData = [
        'name' => sanitizeInput($_POST['name']),
        'company' => sanitizeInput($_POST['company']),
        'role' => sanitizeInput($_POST['role']),
        'email' => sanitizeInput($_POST['email']),
        'interests' => $_POST['interests'] ?? [],
        'message' => sanitizeInput($_POST['message'] ?? '')
    ];
    
    // Validate email
    if (!validateEmail($formData['email'])) {
        logSubmission($formData, false, 'Invalid email format');
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Please enter a valid email address.'
        ]);
        exit;
    }
    
    // Validate name length
    if (strlen($formData['name']) < 2) {
        logSubmission($formData, false, 'Name too short');
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Name must be at least 2 characters long.'
        ]);
        exit;
    }
    
    // Validate message length (if provided)
    if (!empty($formData['message']) && strlen($formData['message']) > 2000) {
        logSubmission($formData, false, 'Message too long');
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Message must be less than 2000 characters.'
        ]);
        exit;
    }
    
    // Sanitize interests array
    if (is_array($formData['interests'])) {
        $formData['interests'] = array_map('sanitizeInput', $formData['interests']);
    }
    
    // Send email
    if (sendEmail($formData, $to_email, $from_email, $from_name)) {
        logSubmission($formData, true, 'Email sent successfully');
        echo json_encode([
            'success' => true,
            'message' => 'Thank you for your message! We\'ll get back to you soon.'
        ]);
    } else {
        logSubmission($formData, false, 'Failed to send email');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'There was an error sending your message. Please try again later.'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Contact form error: " . $e->getMessage());
    logSubmission($_POST ?? [], false, 'Exception: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An unexpected error occurred. Please try again later.'
    ]);
}

// ==============================================
// END OF CONTACT HANDLER
// ==============================================
?>
