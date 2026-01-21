<?php
/**
 * Server-side wish credits storage
 * Stores purchased wishes by WebAuth username so they persist across sessions/devices
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$creditsFile = __DIR__ . '/private/credits.json';

// Ensure private directory exists
if (!is_dir(__DIR__ . '/private')) {
    mkdir(__DIR__ . '/private', 0750, true);
}

// Load existing credits
function loadCredits() {
    global $creditsFile;
    if (file_exists($creditsFile)) {
        $data = json_decode(file_get_contents($creditsFile), true);
        return is_array($data) ? $data : [];
    }
    return [];
}

// Save credits
function saveCredits($credits) {
    global $creditsFile;
    file_put_contents($creditsFile, json_encode($credits, JSON_PRETTY_PRINT));
}

// Validate username (Proton account format)
function isValidUsername($username) {
    return preg_match('/^[a-z1-5.]{1,12}$/', $username);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$username = $_GET['username'] ?? $_POST['username'] ?? '';

// Validate username
if (!$username || !isValidUsername($username)) {
    echo json_encode(['success' => false, 'error' => 'Invalid username']);
    exit;
}

$credits = loadCredits();

switch ($action) {
    case 'get':
        // Get current credits for user
        $userCredits = $credits[$username] ?? ['wishes' => 0, 'free_used_date' => null];

        // Check if free wish is available today
        $today = date('Y-m-d');
        $freeAvailable = ($userCredits['free_used_date'] !== $today);

        echo json_encode([
            'success' => true,
            'wishes' => (int)$userCredits['wishes'],
            'free_available' => $freeAvailable,
            'last_updated' => $userCredits['last_updated'] ?? null
        ]);
        break;

    case 'add':
        // Add purchased wishes
        $amount = (int)($_POST['amount'] ?? $_GET['amount'] ?? 0);
        $memo = $_POST['memo'] ?? $_GET['memo'] ?? '';

        if ($amount <= 0 || $amount > 10000) {
            echo json_encode(['success' => false, 'error' => 'Invalid amount']);
            exit;
        }

        if (!isset($credits[$username])) {
            $credits[$username] = ['wishes' => 0, 'free_used_date' => null, 'history' => []];
        }

        $credits[$username]['wishes'] += $amount;
        $credits[$username]['last_updated'] = date('c');
        $credits[$username]['history'][] = [
            'action' => 'add',
            'amount' => $amount,
            'memo' => substr($memo, 0, 100),
            'timestamp' => date('c'),
            'ip' => getClientIP()
        ];

        // Keep history manageable
        if (count($credits[$username]['history']) > 100) {
            $credits[$username]['history'] = array_slice($credits[$username]['history'], -100);
        }

        saveCredits($credits);

        echo json_encode([
            'success' => true,
            'wishes' => $credits[$username]['wishes'],
            'added' => $amount
        ]);
        break;

    case 'use':
        // Use a purchased wish
        if (!isset($credits[$username]) || $credits[$username]['wishes'] <= 0) {
            echo json_encode(['success' => false, 'error' => 'No credits remaining']);
            exit;
        }

        $credits[$username]['wishes']--;
        $credits[$username]['last_updated'] = date('c');
        $credits[$username]['history'][] = [
            'action' => 'use',
            'amount' => -1,
            'timestamp' => date('c')
        ];

        saveCredits($credits);

        echo json_encode([
            'success' => true,
            'wishes' => $credits[$username]['wishes']
        ]);
        break;

    case 'use_free':
        // Use free daily wish
        $today = date('Y-m-d');

        if (!isset($credits[$username])) {
            $credits[$username] = ['wishes' => 0, 'free_used_date' => null, 'history' => []];
        }

        if ($credits[$username]['free_used_date'] === $today) {
            echo json_encode(['success' => false, 'error' => 'Free wish already used today']);
            exit;
        }

        $credits[$username]['free_used_date'] = $today;
        $credits[$username]['last_updated'] = date('c');
        $credits[$username]['history'][] = [
            'action' => 'free',
            'timestamp' => date('c')
        ];

        saveCredits($credits);

        echo json_encode([
            'success' => true,
            'free_available' => false
        ]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

function getClientIP() {
    $headers = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = $_SERVER[$header];
            if (strpos($ip, ',') !== false) {
                $ip = trim(explode(',', $ip)[0]);
            }
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return 'unknown';
}
?>
