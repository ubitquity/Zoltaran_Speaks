<?php
/**
 * Security: Block direct access to private directory
 * Any attempt to access files in this directory via web will be blocked
 */

http_response_code(403);
header('Content-Type: text/plain');
die('403 Forbidden - Access Denied');
