let request = require('request');
let http = require('http');

let PROCESS_SERVER_HOST = process.env.PROCESS_SERVER_HOST || 'localhost:8080';
let CONTAINER_ID = process.env.PROCESS_CONTAINER_ID || 'ProcessContainer';
let BASIC_AUTH = process.env.PROCESS_BASIC_AUTH || 'Basic cHJvY2Vzc29yOnByb2Nlc3NvciM5OQ==';
let SERVICES_SERVER_HOST = process.env.SERVICES_SERVER_HOST || 'localhost:8080';

exports.getExistingClaims = function (req, res) {
    if (req.body) {
        let options = {
            url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/queries/processes/instances?status=1',
            headers: {
                'Accept': 'application/json',
                'Authorization': BASIC_AUTH
            },
            method: 'GET'
        };

        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let existingClaims = [];
                let claimCount = 0;
                let processes = JSON.parse(body)['process-instance'];
                let processCount = processes.length;
                if (processes && processCount > 0) {
                    processes.forEach(function (process) {
                        loadClaimDetails(process, function (claim) {
                            claimCount++;
                            if (claim != null || claim != undefined) {
                                claim.photos = [];
                                if (claim.incidentPhotoIds && claim.incidentPhotoIds.length > 0) {
                                    claim.incidentPhotoIds.forEach(function (p, i) {
                                        let link = 'http://' + SERVICES_SERVER_HOST + '/photos/' + claim.processId + '/' + p.replace(/'/g, '');
                                        claim.photos.push(link);
                                    });
                                }
                                existingClaims.push(claim);
                            }
                            if (claimCount === processCount) {
                                return res.json(existingClaims);
                            }
                        });
                    });
                } else {
                    return res.json(existingClaims);
                }
            } else {
                return res.status(500).json({ error: 'DB record retreival error!' });
            }
        });
    }
};

function loadClaimDetails(process, cb) {
    let instanceId = process[['process-instance-id']];
    let options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + CONTAINER_ID + '/processes/instances/' + instanceId + '/variables',
        headers: {
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'GET'
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            let claim = JSON.parse(body);
            claim.processId = instanceId;
            cb(claim);
        } else {
            console.error('got an error: ', error);
            cb(null);
        }
    });
};

exports.startProcess = function (req, res) {
    let claim = req.body.claim;
    let incident = claim.incident;

    let incident = {
        'com.redhat.vizuri.demo.domain.Incident': {
            'id': incident.id,
            'reporterUserId': incident.reporterUserId,
            'incidentType': incident.type,
            'description': incident.description,
            'incidentDate': incident.incidentDate,
            'buildingName': incident.buildingName,
            'stateCode': incident.stateCode,
            'zipCode': incident.zipCode,
            'severity': incident.severity
        }
    };

    let questionnaire = {
        'com.redhat.vizuri.demo.domain.Questionnaire': {
            'id': 1,
            'name': claim.questionnaire.name,
            'questions': [],
            'answers': [],
            'completedBy': null,
            'completedDate': null
        }
    };

    let questionTemplate = {
        'questionId': 'win-1',
        'questionnaireId': 1,
        'groupId': null,
        'description': 'Is the crack larger than a quarter?',
        'answerType': 'YES_NO',
        'required': false,
        'enabled': true,
        'order': 1,
        'options': []
    };

    let answerTemplate = {
        'questionId': 'win-1',
        'groupId': null,
        'strValue': 'No'
    };

    let question;
    let answer;

    claim.questionnaire.questions.forEach(function (q, i) {
        question = JSON.parse(JSON.stringify(questionTemplate));
        question.questionId = q.questionId;
        question.description = q.description;
        question.enabled = q.enabled;
        question.order = q.order;
        questionnaire['com.redhat.vizuri.demo.domain.Questionnaire'].questions.push(question);
    });

    claim.questionnaire.answers.forEach(function (a, i) {
        answer = JSON.parse(JSON.stringify(answerTemplate));
        answer.questionId = a.questionId;
        answer.strValue = a.strValue;
        questionnaire['com.redhat.vizuri.demo.domain.Questionnaire'].answers.push(answer);
    });

    let msg = {
        'incident': incident,
        'questionnaire': questionnaire
    };

    let options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + CONTAINER_ID + '/processes/processes.report-incident/instances',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'POST',
        json: msg
    };

    // Send request
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 201) {
            return res.json(body);
        } else {
            res.json(error);
        }
    });
};

exports.addPhoto = function (instanceId, fileName, source, cb) {
    let updateInfo = {
        'photoId': fileName,
        'updateSource': source
    };

    signalHumanTask(instanceId, 'Update%20Information', function (error) {
        if (!error) {
            listReadyTasks(instanceId, 'Update Information', function (error, taskId) {
                if (!error) {
                    console.log('calling updateInformation');
                    updateInformation(taskId, updateInfo, function (error) {
                        if (!error) {
                            cb(null, 'SUCCESS');
                        } else {
                            let msg = 'Unable to add photo, error: ' + error;
                            console.error(msg);
                            cb(msg);
                        }
                    });
                } else {
                    let msg = 'Unable to list ready tasks, error: ' + error;
                    cb(msg);
                }
            });
        } else {
            let msg = 'Unable to signal for human task, error: ' + error;
            cb(msg);
        }
    });
};

exports.addComment = function (req, res) {
    let body = req.body;
    let instanceId = req.params.instanceId;
    let updateInfo = {
        'comment': body.claimComments,
        'updateSource': body.messageSource
    };

    signalHumanTask(instanceId, 'Update%20Information', function (error) {
        if (!error) {
            listReadyTasks(instanceId, 'Update Information', function (error, taskId) {
                if (!error) {
                    updateInformation(taskId, updateInfo, function (error) {
                        if (!error) {
                            console.log('Claim updated successful');
                            res.json('SUCCESS');
                        } else {
                            let msg = 'Unable to add comment, error: ' + error;
                            console.error(msg);
                            res.json(msg);
                        }
                    });
                } else {
                    let msg = 'Unable to list ready tasks, error: ' + error;
                    res.json();
                }
            });
        } else {
            let msg = 'Unable to signal for human task, error: ' + error;
            res.json('Unable to signal for human task, error: ' + error);
        }
    });
};

// Perform Remediation
exports.performRemediation = function (req, res) {
    let body = req.body;
    let instanceId = req.params.instanceId;
    let complete = req.params.complete;
    let updateInfo = { 'completed': complete };

    signalHumanTask(instanceId, 'Perform%20Remediation', function (error) {
        if (!error) {
            listReadyTasks(instanceId, 'Perform Remediation', function (error, taskId) {
                if (!error) {
                    updateInformation(taskId, updateInfo, function (error) {
                        if (!error) {
                            res.json('SUCCESS');
                        } else {
                            let msg = 'Unable to add comment, error: ' + error;
                            res.json(msg);
                        }
                    });
                } else {
                    let msg = 'Unable to list ready tasks, error: ' + error;
                    res.json(msg);
                }
            });
        } else {
            let msg = 'Unable to signal for human task, error: ' + error;
            res.json(msg);
        }
    });
};

function signalHumanTask(instanceId, type, cb) {
    let options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + CONTAINER_ID + '/processes/instances/signal/' + type + '?instanceId=' + instanceId,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'POST'
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            cb(null);
        } else {
            cb(error);
        }
    });
};

function listReadyTasks(instanceId, type, cb) {
    let options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/queries/tasks/instances/process/' + instanceId + '?status=Ready',
        headers: {
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'GET'
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            let data = JSON.parse(body);
            let tasks = data['task-summary'];
            if (tasks != undefined) {
                // Go through the list of tasks and find the 'Update Information task
                for (let i = 0; i < tasks.length; i++) {
                    if (tasks[i]['task-name'] === type && tasks[i]['task-status'] === 'Ready') {
                        return cb(null, tasks[i]['task-id']);
                    }
                }
                return cb(new Error('unable to find task'));
            } else {
                cb(null);
            }
        } else {
            cb(error);
        }
    });
}

function updateInformation(taskId, updateInfo, cb) {
    let options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + CONTAINER_ID + '/tasks/' + taskId + '/states/completed?auto-progress=true',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'PUT',
        json: updateInfo
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 201) {
            cb(null);
        } else {
            cb(error);
        }
    });
};