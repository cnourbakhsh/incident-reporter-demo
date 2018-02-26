let request = require('request');

let PROCESS_SERVER_HOST = process.env.PROCESS_SERVER_HOST || 'process-server-incident-demo.192.168.99.100.nip.io';
let PROCESS_CONTAINER_ID = process.env.PROCESS_CONTAINER_ID || '1776e960572610314f3f813a5dbb736d';
let BASIC_AUTH = process.env.PROCESS_BASIC_AUTH || 'Basic cHJvY2Vzc29yOnByb2Nlc3NvciM5OQ==';

exports.loadClaimDetails = (process, cb) => {
    console.log('app loadClaimDetails');
    let instanceId = process['process-instance-id'];
    let options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + PROCESS_CONTAINER_ID + '/processes/instances/' + instanceId + '/variables',
        headers: {
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'GET'
    };

    request(options, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            let claim = JSON.parse(body);
            claim.processId = instanceId;
            cb(claim);
        } else {
            cb(null);
        }
    });
};

exports.signalHumanTask = (instanceId, type, cb) => {
    console.log('app signalHumanTask');
    let options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + PROCESS_CONTAINER_ID + '/processes/instances/signal/' + type + '?instanceId=' + instanceId,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'POST'
    };

    request(options, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            cb(null);
        } else {
            cb(error);
        }
    });
};

exports.listReadyTasks = (instanceId, type, cb) => {
    console.log('app listReadyTasks');
    let options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/queries/tasks/instances/process/' + instanceId + '?status=Ready',
        headers: {
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'GET'
    };

    request(options, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            let data = JSON.parse(body);
            let tasks = data['task-summary'];
            if (tasks) {
                for (let task of tasks) {
                    if (task['task-name'] === type && task['task-status'] === 'Ready') {
                        return cb(null, task['task-id']);
                    }
                }
                return cb(new Error('Unable to find task'));
            } else {
                cb(null);
            }
        } else {
            cb(error);
        }
    });
}

exports.updateInformation = (taskId, updateInfo, cb) => {
    console.log('app updateInformation');
    //updateInfo.id = taskId;
    let options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + PROCESS_CONTAINER_ID + '/tasks/' + taskId + '/states/completed?user=dummy&auto-progress=true',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'PUT',
        json: updateInfo
    };

    request(options, (error, response, body) => {
        if (response.statusCode != 201) {
            cb(new Error('Unsuccesful process task update, error: ' + response.body));
        } else {
            cb(null);
        }
    });
};