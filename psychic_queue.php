<?php
/**
 * Psychic Traveller Wish Game - Backend API
 * Handles game result logging, leaderboard, and payout queue
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// File paths
$LOG_FILE = __DIR__ . '/log.txt';
$PAYOUT_QUEUE_FILE = __DIR__ . '/payout_queue.txt';
$PRIVATE_JSON_LOG = __DIR__ . '/private/wishes.json'; // Private JSON log

// Ensure directories and files exist
if (!file_exists($LOG_FILE)) {
    file_put_contents($LOG_FILE, "# Psychic Traveller Wish Game Log\n# Format: timestamp | user | result | tokens_won | memo\n# Wishes are stored privately\n\n");
}
if (!file_exists($PAYOUT_QUEUE_FILE)) {
    file_put_contents($PAYOUT_QUEUE_FILE, "# Payout Queue\n# Format: timestamp | queue_id | recipient | amount | memo | status\n\n");
}

// Create private directory with index.php protection
$privateDir = __DIR__ . '/private';
if (!is_dir($privateDir)) {
    mkdir($privateDir, 0750, true); // chmod 750
    // Create index.php to block directory listing/access
    $indexContent = "<?php\nhttp_response_code(403);\ndie('403 Forbidden');\n";
    file_put_contents($privateDir . '/index.php', $indexContent);
}
if (!file_exists($PRIVATE_JSON_LOG)) {
    file_put_contents($PRIVATE_JSON_LOG, json_encode(['wishes' => []], JSON_PRETTY_PRINT));
}

// Get request data
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'log_result':
        logGameResult($input, $LOG_FILE, $PRIVATE_JSON_LOG);
        break;

    case 'queue_payout':
        queuePayout($input, $PAYOUT_QUEUE_FILE);
        break;

    case 'get_leaderboard':
        getLeaderboard($LOG_FILE);
        break;

    case 'get_stats':
        getStats($LOG_FILE, $input['user'] ?? '');
        break;

    case 'get_recent':
        getRecentActivity($LOG_FILE);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

/**
 * Get client IP address (handles proxies)
 */
function getClientIP() {
    $ipKeys = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
    foreach ($ipKeys as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = $_SERVER[$key];
            // Handle comma-separated list (X-Forwarded-For)
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

/**
 * Log a game result
 */
function logGameResult($data, $file, $jsonFile) {
    $user = sanitizeAccount($data['user'] ?? '');
    $result = strtoupper($data['result_code'] ?? 'UNKNOWN');
    $tokens = intval($data['tokens_won'] ?? 0);
    $memo = preg_replace('/[^A-Za-z0-9_-]/', '', $data['memo'] ?? '');
    $rawWish = $data['wish'] ?? '';
    // Check for abusive patterns (scripts, SQL, code execution attempts)
    $abusePatterns = '/<script|javascript:|on\w+\s*=|SELECT\s|INSERT\s|DELETE\s|DROP\s|UPDATE\s|UNION\s|eval\(|exec\(|system\(|\$\{|<\?|<%|\\\x/i';
    if (preg_match($abusePatterns, $rawWish)) {
        echo json_encode(['success' => false, 'error' => 'try again']);
        return;
    }
    // Allow letters, numbers, spaces, and basic punctuation for paragraphs
    $wish = substr(preg_replace('/[^A-Za-z0-9 .,!?\'\"\n\r-]/', '', $rawWish), 0, 180);
    $ip = getClientIP();
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'unknown', 0, 200);

    if (empty($user)) {
        echo json_encode(['success' => false, 'error' => 'Invalid user']);
        return;
    }

    // Map result codes to readable names
    $resultMap = [
        'WISH_GRANTED' => 'WIN',
        'TOKENS_250' => 'TOKENS',
        'TOKENS_500' => 'TOKENS',
        'TOKENS_1000' => 'TOKENS',
        'FREE_SPIN' => 'FREE_SPIN',
        'TRY_AGAIN' => 'LOSE',
        'WIN' => 'WIN',
        'LOSE' => 'LOSE'
    ];

    $displayResult = $resultMap[$result] ?? $result;

    $timestamp = date('c');

    // Public log (no IP, no wish - wishes only stored in private JSON)
    $line = "$timestamp | $user | $displayResult | $tokens | $memo\n";

    // Append to public log with exclusive lock
    $success = file_put_contents($file, $line, FILE_APPEND | LOCK_EX);

    // Private JSON log (with IP for abuse monitoring)
    $jsonData = [];
    if (file_exists($jsonFile)) {
        $jsonData = json_decode(file_get_contents($jsonFile), true) ?? ['wishes' => []];
    }

    $jsonData['wishes'][] = [
        'timestamp' => $timestamp,
        'user' => $user,
        'result' => $displayResult,
        'result_code' => $result,
        'tokens' => $tokens,
        'wish' => $wish,
        'memo' => $memo,
        'ip' => $ip,
        'user_agent' => $userAgent
    ];

    // Keep only last 10000 entries to prevent file bloat
    if (count($jsonData['wishes']) > 10000) {
        $jsonData['wishes'] = array_slice($jsonData['wishes'], -10000);
    }

    file_put_contents($jsonFile, json_encode($jsonData, JSON_PRETTY_PRINT), LOCK_EX);

    if ($success !== false) {
        echo json_encode([
            'success' => true,
            'logged' => [
                'user' => $user,
                'result' => $displayResult,
                'tokens' => $tokens,
                'timestamp' => $timestamp
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to write log']);
    }
}

/**
 * Queue a payout request
 */
function queuePayout($data, $file) {
    $recipient = sanitizeAccount($data['recipient'] ?? '');
    $amount = intval($data['amount'] ?? 0);
    $memo = preg_replace('/[^A-Za-z0-9_-]/', '', $data['memo'] ?? '');

    if (empty($recipient) || $amount <= 0) {
        echo json_encode(['success' => false, 'error' => 'Invalid payout request']);
        return;
    }

    // Check for duplicate pending payouts
    if (file_exists($file)) {
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '#') === 0) continue;
            if (strpos($line, 'PENDING') !== false && strpos($line, $recipient) !== false) {
                // Already has pending payout
                echo json_encode(['success' => false, 'error' => 'Already has pending payout', 'duplicate' => true]);
                return;
            }
        }
    }

    $queueId = 'PW' . strtoupper(bin2hex(random_bytes(6)));
    $timestamp = date('c');
    $quantity = number_format($amount, 0) . ' ARCADE';

    $line = "$timestamp | $queueId | $recipient | $quantity | $memo | PENDING\n";

    $success = file_put_contents($file, $line, FILE_APPEND | LOCK_EX);

    if ($success !== false) {
        echo json_encode([
            'success' => true,
            'queue_id' => $queueId,
            'recipient' => $recipient,
            'amount' => $amount,
            'memo' => $memo
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to queue payout']);
    }
}

/**
 * Get leaderboard (top 3 players)
 */
function getLeaderboard($file) {
    $stats = [];

    if (!file_exists($file)) {
        echo json_encode(['success' => true, 'leaderboard' => []]);
        return;
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;

        $parts = array_map('trim', explode('|', $line));
        if (count($parts) < 4) continue;

        $user = $parts[1];
        $result = $parts[2];
        $tokens = intval($parts[3]);

        if (!isset($stats[$user])) {
            $stats[$user] = [
                'user' => $user,
                'wishes' => 0,
                'wins' => 0,
                'tokens' => 0,
                'free_spins' => 0
            ];
        }

        $stats[$user]['wishes']++;

        if ($result === 'WIN' || $result === 'WISH_GRANTED') {
            $stats[$user]['wins']++;
        }
        if ($result === 'TOKENS' || strpos($result, 'TOKENS_') !== false) {
            $stats[$user]['tokens'] += $tokens;
        }
        if ($result === 'FREE_SPIN') {
            $stats[$user]['free_spins']++;
        }
    }

    // Sort by wins (primary), then tokens (secondary)
    usort($stats, function($a, $b) {
        if ($b['wins'] !== $a['wins']) {
            return $b['wins'] - $a['wins'];
        }
        return $b['tokens'] - $a['tokens'];
    });

    // Return top 3
    $top3 = array_slice(array_values($stats), 0, 3);

    echo json_encode([
        'success' => true,
        'leaderboard' => $top3,
        'log_url' => 'https://ndao.org/arcade/games/Zoltarano_Speaks/log.txt'
    ]);
}

/**
 * Get stats for a specific user
 */
function getStats($file, $user) {
    $user = sanitizeAccount($user);

    if (empty($user)) {
        echo json_encode(['success' => false, 'error' => 'Invalid user']);
        return;
    }

    $stats = [
        'user' => $user,
        'wishes' => 0,
        'wins' => 0,
        'tokens' => 0,
        'free_spins' => 0,
        'losses' => 0
    ];

    if (!file_exists($file)) {
        echo json_encode(['success' => true, 'stats' => $stats]);
        return;
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, $user) === false) continue;

        $parts = array_map('trim', explode('|', $line));
        if (count($parts) < 4) continue;
        if ($parts[1] !== $user) continue;

        $result = $parts[2];
        $tokens = intval($parts[3]);

        $stats['wishes']++;

        if ($result === 'WIN' || $result === 'WISH_GRANTED') {
            $stats['wins']++;
        } elseif ($result === 'TOKENS' || strpos($result, 'TOKENS_') !== false) {
            $stats['tokens'] += $tokens;
        } elseif ($result === 'FREE_SPIN') {
            $stats['free_spins']++;
        } elseif ($result === 'LOSE' || $result === 'TRY_AGAIN') {
            $stats['losses']++;
        }
    }

    echo json_encode(['success' => true, 'stats' => $stats]);
}

/**
 * Get recent activity (last 10 results)
 */
function getRecentActivity($file) {
    $activity = [];

    if (!file_exists($file)) {
        echo json_encode(['success' => true, 'activity' => []]);
        return;
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $lines = array_reverse($lines); // Most recent first

    $count = 0;
    foreach ($lines as $line) {
        if ($count >= 10) break;
        if (strpos($line, '#') === 0) continue;

        $parts = array_map('trim', explode('|', $line));
        if (count($parts) < 4) continue;

        $activity[] = [
            'timestamp' => $parts[0],
            'user' => $parts[1],
            'result' => $parts[2],
            'tokens' => intval($parts[3])
        ];
        $count++;
    }

    echo json_encode(['success' => true, 'activity' => $activity]);
}

/**
 * Sanitize WebAuth account name
 */
function sanitizeAccount($account) {
    $account = strtolower(trim($account));
    // WebAuth/Proton accounts: 1-12 chars, a-z, 1-5, dots allowed
    if (!preg_match('/^[a-z1-5.]{1,12}$/', $account)) {
        return '';
    }
    return $account;
}
