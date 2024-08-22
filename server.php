<?php

require_once __DIR__ . '/inc.lib//vendor/autoload.php';

use Psr\Http\Message\RequestInterface;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\Session\SessionProvider;
use Symfony\Component\HttpFoundation\Session\Storage\Handler\NativeFileSessionHandler;

class Chat implements MessageComponentInterface {
    
    /**
     * Session name
     *
     * @var string
     */
    private $sessionName = 'PHPSESSID';
    
    /**
     * Session save path
     *
     * @var string
     */
    private $sessionSavePath = null;
    
    /**
     * Client list
     *
     * @var [type]
     */
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
        $request = $conn->httpRequest;
                        
        if (isset($request)) {
            $cookies = $this->getCookies($request->getHeaders());
            $sessions = $this->getSessions($cookies);
            $websocketChannel = $sessions['websocketChannel'];
            $conn->websocketChannel = $websocketChannel;
            $queryParams = $request->getUri()->getQuery();
            parse_str($queryParams, $params);
        }

        $this->clients[$conn->resourceId] = $conn;
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);       
        $request = $from->httpRequest;                     
        if (isset($request)) {
            
            $cookies = $this->getCookies($request->getHeaders());
            $sessions = $this->getSessions($cookies);
            print_r($sessions);
            $websocketChannelTarget = $sessions['websocketChannelTarget'];         
            foreach($this->clients as $client)
            {
                if($client->websocketChannel == $websocketChannelTarget)
                {
                    $client->send($msg);
                }
            }
        }
    }

    public function onClose(ConnectionInterface $conn) {
        // Menghapus koneksi yang terputus
        unset($this->clients[$conn->resourceId]);
        echo "Connection {$conn->resourceId} has disconnected\n";
        echo "CHANNEL = ".$conn->websocketChannel."\r\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }
    
    /**
     * Get cookies from headers
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
            $cookiesArray = explode('; ', $cookiesRaw);
            $parsedCookies = [];
            foreach ($cookiesArray as $cookie) {
                list($name, $value) = explode('=', $cookie, 2);
                $parsedCookies[$name] = $value;
            }
            return $parsedCookies;
        }
        return array();
    }
    
    /**
     * Get sessions from cookies
     *
     * @param array $cookies
     * @return array
     */
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
    
    /**
     * Deserialize session
     *
     * @param string $sessionData
     * @return array
     */
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
     * @return self
     */ 
    public function setSessionName($sessionName)
    {
        $this->sessionName = $sessionName;

        return $this;
    }

    /**
     * Get session save path
     *
     * @return string
     */ 
    public function getSessionSavePath()
    {
        return $this->sessionSavePath;
    }

    /**
     * Set session save path
     *
     * @param  string  $sessionSavePath  Session save path
     *
     * @return self
     */ 
    public function setSessionSavePath(string $sessionSavePath)
    {
        $this->sessionSavePath = $sessionSavePath;

        return $this;
    }
}

$sessionSavePath = 'C:\\PortableApps\\usbwebserver\\php\\tmp';
$sessionName = 'SIPROSES';
$port = 8080;

$sessionHandler = new NativeFileSessionHandler($sessionSavePath);

$chat = new Chat();
$chat->setSessionName($sessionName);
$chat->setSessionSavePath($sessionSavePath);

$session = new SessionProvider(
    new WsServer($chat),
    $sessionHandler
);

$server = IoServer::factory(
    new HttpServer($session),
    $port
);

$server->run();