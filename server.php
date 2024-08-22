<?php

require_once __DIR__ . '/inc.lib//vendor/autoload.php';

use Psr\Http\Message\RequestInterface;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\Session\SessionProvider;
use Symfony\Component\HttpFoundation\Session\Storage\Handler;

class Chat implements MessageComponentInterface {
    private $sessionName = 'PHPSESSID';
    protected $clients;

    public function __construct() {
        $this->clients = [];
    }

    /**
     * Undocumented function
     *
     * @param ConnectionInterface $conn
     * @return void
     */
    public function onOpen(ConnectionInterface $conn) {
        // Mengatur data sesi

        // Mengakses parameter dari handshake
        $request = $conn->httpRequest;
                        
        if (isset($request)) {
            
            
            $cookies = $this->getCookies($request->getHeaders());
            
            $sessions = $this->getSessions($cookies);
            print_r($sessions);
            
            $queryParams = $request->getUri()->getQuery();
            parse_str($queryParams, $params);
            echo "Query Parameters: " . print_r($params, true) . "\n";
        }

        // Menyimpan koneksi baru
        $this->clients[$conn->resourceId] = $conn;
        echo "New connection! ({$conn->resourceId})\n";
    }

    

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        $targetId = $data['targetId'];
        $message = $data['message'];

        // Mengakses data sesi
        $session = $from->Session;
        $userId = $session->get('user_id');

        echo "User ID: {$userId}\n";

        // Mengirim pesan hanya ke penerima yang dituju
        if (isset($this->clients[$targetId])) {
            $this->clients[$targetId]->send($message);
        } else {
            $from->send("User not found: {$targetId}");
        }
    }

    public function onClose(ConnectionInterface $conn) {
        // Menghapus koneksi yang terputus
        unset($this->clients[$conn->resourceId]);
        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }
    
    
    /**
     * Parse cookies from headers
     *
     * @param array $headers
     * @return string[]
     */
    public function getCookies($headers)
    {
        $cookiesRaw = null;
        $cookiesBuff = array();
        foreach($headers as $key=>$header)
        {
            if(strtolower($key) == 'cookie')
            {
                foreach($header as $cookie)
                {
                    $cookiesBuff[] = $cookie;
                }
                break;
            }
        }
        
        if(!empty($cookiesBuff))
        {
            $cookiesRaw = implode("; ", $cookiesBuff);
        }
        
        if(isset($cookiesRaw))
        {

            // Pisahkan cookie menjadi array
            $cookiesArray = explode('; ', $cookiesRaw);

            // Inisialisasi array asosiatif untuk menyimpan cookie
            $parsedCookies = [];

            foreach ($cookiesArray as $cookie) {
                // Pisahkan nama dan nilai cookie
                list($name, $value) = explode('=', $cookie, 2);
                // Tambahkan ke array asosiatif
                $parsedCookies[$name] = $value;
            }

            // Cetak array asosiatif
            return $parsedCookies;
        }
        return array();
    }
    
    public function getSessions($cookies)
    {
        $sessionName = $this->getSessionName();
        $sessionId = $cookies[$sessionName];
        $sessionSavePath = ini_get('session.save_path');
        $sessionFile = $sessionSavePath . '/sess_' . $sessionId;
        if(file_exists($sessionFile))
        {
            $sessionData = file_get_contents($sessionFile);
            return $this->parseSessionData($sessionData);
        }
        return array();
    }
    
    public function parseSessionData($sessionData) {
        $returnData = [];
        $offset = 0;
        while ($offset < strlen($sessionData)) {
            if (!strstr(substr($sessionData, $offset), "|")) {
                break;
            }
            $pos = strpos($sessionData, "|", $offset);
            $num = $pos - $offset;
            $varname = substr($sessionData, $offset, $num);
            $offset += $num + 1;
            $data = unserialize(substr($sessionData, $offset));
            $returnData[$varname] = $data;
            $offset += strlen(serialize($data));
        }
        return $returnData;
    }
    

    /**
     * Get the value of sessionName
     * @return string
     */ 
    public function getSessionName()
    {
        return $this->sessionName;
    }

    /**
     * Set the value of sessionName
     *
     * @param string $sessionName
     * @return  self
     */ 
    public function setSessionName($sessionName)
    {
        $this->sessionName = $sessionName;

        return $this;
    }
}

$sessionSavePath = 'C:\\PortableApps\\usbwebserver\\php\\tmp';
//ini_set('session.save_path', $sessionSavePath);

$sessionHandler = new Handler\NativeFileSessionHandler($sessionSavePath);
//session_start();
$chat = new Chat();
$chat->setSessionName('SIPROSES');

$session = new SessionProvider(
    new WsServer($chat),
    $sessionHandler,
    [
        'auto_start' => true,
        'cookie_lifetime' => 0,
        'gc_maxlifetime' => 1440,
        'cookie_secure' => false,
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax'
    ]
);

$server = IoServer::factory(
    new HttpServer($session),
    8080
);

$server->run();