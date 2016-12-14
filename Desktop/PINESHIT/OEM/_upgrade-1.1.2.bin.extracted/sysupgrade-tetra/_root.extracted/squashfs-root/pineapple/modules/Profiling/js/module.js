function getBSSIDLineNumber(textarea) {
    var lineNumber = textarea.value.substr(0, textarea.selectionStart).split("\n").length;
    var bssid = textarea.value.split("\n")[lineNumber - 1].trim();
    $("input[name='bssid']").val(bssid).trigger('input');
}

function getSSIDLineNumber(textarea) {
    var lineNumber = textarea.value.substr(0, textarea.selectionStart).split("\n").length;
    var ssid = textarea.value.split("\n")[lineNumber - 1].trim();
    $("input[name='ssid']").val(ssid).trigger('input');
}

registerController('profilingController', ['$api', '$scope', function ($api, $scope) {
    $scope.keys = Object.keys;

    $scope.running = false;
    $scope.throbber = false;

    $scope.working = false;
    $scope.unassociatedWorking = false;

    $scope.ssid = "";
    $scope.bssid = "";

    $scope.ssidList = "";
    $scope.bssidList = "";

    $scope.profiles = [];
    $scope.selectedProfile = "";

    $scope.loadedProfile = {
        name: "",
        accessPoints: [],
        unassociatedClients: []
    };

    $scope.getProfiles = (function (load) {
        $api.request({
            module: "Profiling",
            action: "getProfiles"
        }, function (response) {
            if (response.error === undefined) {
                $scope.profiles = response.profiles;
                $scope.selectedProfile = $scope.profiles[0];
                if (load) {
                    $scope.loadProfile();
                }
            } else {
                $scope.profiles = [];
            }
        });
    });

    $scope.getStatus = (function () {
        $api.request({
            module: "Profiling",
            action: "getStatus"
        }, function (response) {
            if (response.error === undefined) {
                $scope.running = response.running;
            }
        });
    });

    $scope.startProfiling = (function () {
        $scope.throbber = true;
        $api.request({
            module: "Profiling",
            action: "start"
        }, function (response) {
            if (response.error === undefined) {
                $scope.running = true;
                $scope.throbber = false;
            }
        });
    });

    $scope.stopProfiling = (function () {
        $scope.throbber = true;
        $api.request({
            module: "Profiling",
            action: "stop"
        }, function (response) {
            if (response.error === undefined) {
                $scope.getProfiles(true);
                $scope.running = false;
                $scope.throbber = false;
            }
        });
    });

    $scope.addSSID = (function () {
        $api.request({
            module: "Profiling",
            action: "addSSID",
            ssid: $scope.ssid
        }, function (response) {
            if (response.error === undefined) {
                $scope.loadSSIDList();
                $scope.ssid = "";
            }
        });
    });

    $scope.addBSSID = (function () {
        $api.request({
            module: "Profiling",
            action: "addBSSID",
            bssid: $scope.bssid
        }, function (response) {
            if (response.error === undefined) {
                $scope.loadBSSIDList();
                $scope.bssid = "";
            }
        });
    });

    $scope.removeSSID = (function () {
        $api.request({
            module: "Profiling",
            action: "removeSSID",
            ssid: $scope.ssid
        }, function (response) {
            if (response.error === undefined) {
                $scope.loadSSIDList();
                $scope.ssid = "";
            }
        });
    });

    $scope.removeBSSID = (function () {
        $api.request({
            module: "Profiling",
            action: "removeBSSID",
            bssid: $scope.bssid
        }, function (response) {
            if (response.error === undefined) {
                $scope.loadBSSIDList();
                $scope.bssid = "";
            }
        });
    });

    $scope.clearSSIDs = (function () {
        $api.request({
            module: "Profiling",
            action: "clearSSIDs"
        }, function (response) {
            if (response.error === undefined) {
                $scope.loadSSIDList();
            }
        });
    });

    $scope.clearBSSIDs = (function () {
        $api.request({
            module: "Profiling",
            action: "clearBSSIDs"
        }, function (response) {
            if (response.error === undefined) {
                $scope.loadBSSIDList();
            }
        });
    });

    $scope.loadSSIDList = (function () {
        $api.request({
            module: "Profiling",
            action: "getSSIDList"
        }, function (response) {
            if (response.error === undefined) {
                $scope.ssidList = response.ssid_list;
            }
        });
    });

    $scope.loadBSSIDList = (function () {
        $api.request({
            module: "Profiling",
            action: "getBSSIDList"
        }, function (response) {
            if (response.error === undefined) {
                $scope.bssidList = response.bssid_list;
            }
        });
    });

    $scope.loadProfile = (function () {
        $api.request({
            module: "Profiling",
            action: "loadProfile",
            profile: $scope.selectedProfile
        }, function (response) {
            if (response.error === undefined) {
                $scope.loadedProfile.name = $scope.selectedProfile
                $scope.loadedProfile.accessPoints = response.data.ap_list;
                $scope.loadedProfile.unassociatedClients = response.data.unassociated_clients;
            }
        });
    });

    $scope.concatProbes = (function (probes) {
        return probes.join(", ");
    });

    $scope.deleteProfile = (function () {
        $api.request({
            module: "Profiling",
            action: "deleteProfile",
            profile: $scope.loadedProfile.name
        }, function (response) {
            if (response.error === undefined) {
                $scope.loadedProfile = {
                    name: "",
                    accessPoints: [],
                    unassociatedClients: []
                };
                $scope.getProfiles();
            }
        });
    });

    $scope.addSSIDToPool = (function () {
        $scope.working = true;
        return $api.request({
            module: "PineAP",
            action: "addSSIDs",
            ssids: getSSIDsFromApArray($scope.loadedProfile.accessPoints)
        }, function () {
            $scope.working = false;
        });
    });

    $scope.addSSIDToFilter = (function () {
        $scope.working = true;
        return $api.request({
            module: "Filters",
            action: "addSSID",
            ssid: getSSIDsFromApArray($scope.loadedProfile.accessPoints)
        }, function () {
            $scope.working = false;
        });
    });

    $scope.addClientProbesToPool = (function () {
        $scope.working = true;
        return $api.request({
            module: "PineAP",
            action: "addSSIDs",
            ssids: getClientProbes($scope.loadedProfile.accessPoints)
        }, function () {
            $scope.working = false;
        });
    });

    $scope.addClientProbesToFilter = (function () {
        $scope.working = true;
        return $api.request({
            module: "Filters",
            action: "addSSID",
            ssid: getClientProbes($scope.loadedProfile.accessPoints)
        }, function () {
            $scope.working = false;
        });
    });

    $scope.addClientsToFilter = (function () {
        var clients = [];
        angular.forEach($scope.loadedProfile.accessPoints, function (value, key) {
            for (var client in value.clients) {
                clients.push(client);
            }
        });
        $scope.working = true;
        return $api.request({
            module: "Filters",
            action: "addClient",
            mac: clients
        }, function () {
            $scope.working = false;
        });
    });

    $scope.addAll = (function () {
        $scope.addSSIDToPool()
            .then($scope.addSSIDToFilter)
            .then($scope.addClientProbesToPool)
            .then($scope.addClientProbesToFilter)
            .then($scope.addClientsToFilter);
    });

    $scope.addUnassociatedProbesToPool = (function () {
        $scope.unassociatedWorking = true;
        return $api.request({
            module: "PineAP",
            action: "addSSIDs",
            ssids: getUnassociatedProbes($scope.loadedProfile.unassociatedClients)
        }, function () {
            $scope.unassociatedWorking = false;
        });
    });
    $scope.addUnassociatedProbesToFilter = (function () {
        $scope.unassociatedWorking = true;
        return $api.request({
            module: "Filters",
            action: "addSSID",
            ssid: getUnassociatedProbes($scope.loadedProfile.unassociatedClients)
        }, function () {
            $scope.unassociatedWorking = false;
        });
    });
    $scope.addUnassociatedClientsToFilter = (function () {
        $scope.unassociatedWorking = true;
        var clients = [];
        for (var client in $scope.loadedProfile.unassociatedClients) {
            clients.push(client);
        }
        return $api.request({
            module: "Filters",
            action: "addClient",
            mac: clients
        }, function () {
            $scope.unassociatedWorking = false;
        });
    });

    $scope.addAllUnassociated = (function () {
        $scope.addUnassociatedProbesToPool()
            .then($scope.addUnassociatedProbesToFilter)
            .then($scope.addUnassociatedClientsToFilter);
    });


    $scope.getStatus();
    $scope.getProfiles(false);
    $scope.loadSSIDList();
    $scope.loadBSSIDList();
}]);

function getSSIDsFromApArray(ap_array) {
    var ssid_array = [];
    angular.forEach(ap_array, function (value, key) {
        if (ssid_array.indexOf(value.ssid) == -1) {
            ssid_array.push(value.ssid);
        }
    });
    return ssid_array
}

function getClientProbes(ap_array) {
    var probes = [];
    angular.forEach(ap_array, function (value, key) {
        for (var client in value.clients) {
            probes = probes.concat(value.clients[client]);
        }
    });
    return $.unique(probes);
}

function getUnassociatedProbes(client_array) {
    var probes = [];
    angular.forEach(client_array, function (value, key) {
        probes = probes.concat(value);
    });
    return $.unique(probes);
}