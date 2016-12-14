<?php namespace pineapple;

class Profiling extends SystemModule
{
    private $clientInterface = "wlan1";

    public function route()
    {
        switch ($this->request->action) {
            case 'start':
                $this->startProfiling();
                break;

            case 'stop':
                $this->stopProfiling();
                break;

            case 'getStatus':
                $this->getStatus();
                break;

            case 'getBSSIDList':
                $this->getBSSIDList();
                break;

            case 'getSSIDList':
                $this->getSSIDList();
                break;

            case 'addSSID':
                $this->addSSID();
                break;

            case 'addBSSID':
                $this->addBSSID();
                break;

            case 'removeSSID':
                $this->removeSSID();
                break;

            case 'removeBSSID':
                $this->removeBSSID();
                break;

            case 'clearSSIDs':
                $this->clearSSIDs();
                break;

            case 'clearBSSIDs':
                $this->clearBSSIDs();
                break;

            case 'getProfiles':
                $this->getProfiles();
                break;

            case 'loadProfile':
                $this->loadProfile();
                break;

            case 'deleteProfile':
                $this->deleteProfile();
                break;
        }
    }

    private function startProfiling()
    {
        if (!$this->checkRunning("pinesniffer wlan1mon 1 2 /tmp/profiling_data")) {
            $this->startMonitorMode();
            unlink("/tmp/profiling_data");
            exec('/usr/sbin/hostapd_cli -i wlan0 karma_log_probes_enable');
            $this->execBackground("profiling=true pinesniffer wlan1mon 1 2 /tmp/profiling_data");
            $this->response = array("success" => true);
        } else {
            $this->error = true;
        }
    }

    private function stopProfiling()
    {
        $pid = file_get_contents("/var/run/pinesniffer.pid");
        if ($pid !== false) {
            exec("kill -SIGALRM {$pid}");
            $this->collectResults();
            $this->response = array("success" => true);
        } else {
            $this->error = true;
        }
    }

    private function getStatus()
    {
        if ($this->checkRunning("pinesniffer wlan1mon 1 2 /tmp/profiling_data")) {
            $this->response = array("running" => true);
        } else {
            $this->response = array("running" => false);
        }
    }

    private function collectResults()
    {
        $file_name = "/etc/pineapple/profiling_data/" . date("Y-m-d_H-i-s");
        $this->execBackground("generate_probe_report > /tmp/profiling_probes");
        while (!file_exists("/tmp/profiling_data") || !file_exists("/tmp/profiling_probes")) {
            sleep(1);
        }
        $data = json_decode(file_get_contents("/tmp/profiling_data"));
        foreach ($data->ap_list as $ap) {
            foreach ($ap->clients as $key => $client) {
                $probes = explode("\t", exec("grep -i {$client} /tmp/profiling_probes"));
                array_shift($probes);
                $ap->clients[$client] = $probes;
                unset($ap->clients[$key]);
            }
        }
        foreach ($data->unassociated_clients as $key => $client) {
            $probes = explode("\t", exec("grep -i {$client} /tmp/profiling_probes"));
            array_shift($probes);
            $data->unassociated_clients[$client] = $probes;
            unset($data->unassociated_clients[$key]);
        }
        file_put_contents($file_name, json_encode($data));
        unlink("/tmp/profiling_data");
        unlink("/tmp/profiling_probes");
    }

    private function loadProfile()
    {
        $filename = '/etc/pineapple/profiling_data/' . $this->request->profile;
        if (file_exists($filename)) {
            $data = json_decode(file_get_contents($filename));
            $this->response = array('success' => true, 'data' => $data);
        } else {
            $this->error = true;
        }
    }

    private function deleteProfile()
    {
        @unlink('/etc/pineapple/profiling_data/' . $this->request->profile);
        $this->response = array('success' => true);
    }

    private function startMonitorMode()
    {
        if (empty(exec("ifconfig | grep {$this->clientInterface}mon"))) {
            exec("airmon-ng start {$this->clientInterface}");
        }
    }

    private function getProfiles()
    {
        @mkdir('/etc/pineapple/profiling_data');
        if ($dh = opendir('/etc/pineapple/profiling_data')) {
            $profiles = array();
            while (($profile = readdir($dh)) !== false) {
                if (substr($profile, 0, 1) !== ".") {
                    array_push($profiles, $profile);
                }
            }
            if (sizeof($profiles)) {
                rsort($profiles);
                $this->response = array('profiles' => $profiles);
            } else {
                $this->error = "No profiles found.";
            }
        } else {
            $this->error = "Error reading profiles.";
        }

    }

    private function getSSIDList()
    {
        @touch('/etc/pineapple/profile-ssid_list');
        $ssid_array = file_get_contents('/etc/pineapple/profile-ssid_list');
        $this->response = array('ssid_list' => $ssid_array);
    }

    private function getBSSIDList()
    {
        @touch('/etc/pineapple/profile-bssid_list');
        $bssid_array = file_get_contents('/etc/pineapple/profile-bssid_list');
        $this->response = array('bssid_list' => $bssid_array);
    }

    private function addBSSID()
    {
        if (!empty($this->request->bssid)) {
            $bssid_array = is_array($this->request->bssid) ? $this->request->bssid : array($this->request->bssid);
            foreach ($bssid_array as $bssid) {
                if (!empty($bssid)) {
                    file_put_contents('/etc/pineapple/profile-bssid_list', trim(strtoupper($bssid)) . "\n",
                        FILE_APPEND);
                }
            }
            $this->response = array('success' => true);
        }
    }

    private function addSSID()
    {
        if (!empty($this->request->ssid)) {
            $ssid_array = is_array($this->request->ssid) ? $this->request->ssid : array($this->request->ssid);
            foreach ($ssid_array as $ssid) {
                if (!empty($ssid)) {
                    file_put_contents('/etc/pineapple/profile-ssid_list', trim($ssid) . "\n", FILE_APPEND);
                }
            }
            $this->response = array('success' => true);
        }
    }

    private function removeBSSID()
    {
        if (!empty($this->request->bssid)) {
            $bssid_array = is_array($this->request->bssid) ? $this->request->bssid : array($this->request->bssid);
            foreach ($bssid_array as $bssid) {
                if (!empty($bssid)) {
                    $bssid = strtoupper($bssid);
                    exec("sed -r '/^({$bssid})$/d' -i /etc/pineapple/profile-bssid_list");
                }
            }
            $this->response = array('success' => true);
        }
    }

    private function removeSSID()
    {
        if (!empty($this->request->ssid)) {
            $ssid_array = is_array($this->request->ssid) ? $this->request->ssid : array($this->request->ssid);
            $ssid_file = explode("\n", file_get_contents('/etc/pineapple/profile-ssid_list'));
            foreach ($ssid_file as $key => $ssid) {
                if (in_array($ssid, $ssid_array)) {
                    unset($ssid_file[$key]);
                }
            }
            file_put_contents('/etc/pineapple/profile-ssid_list', implode("\n", $ssid_file));
            $this->response = array('success' => true);
        }
    }

    private function clearSSIDs()
    {
        unlink('/etc/pineapple/profile-ssid_list');
        touch('/etc/pineapple/profile-ssid_list');
        $this->response = array('success' => true);
    }

    private function clearBSSIDs()
    {
        unlink('/etc/pineapple/profile-bssid_list');
        touch('/etc/pineapple/profile-bssid_list');
        $this->response = array('success' => true);
    }
}
