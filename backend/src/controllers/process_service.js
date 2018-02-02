let request = require('request');
let uuid = require('uuid/v1');
let fs = require('fs');

let SUPERVISOR_ARTIFACT_URI = 'supervisor-ui';
let PROCESS_SERVER_HOST = process.env.PROCESS_SERVER_HOST || 'process-server-incident-demo.192.168.99.100.nip.io';
let PROCESS_CONTAINER_ID = process.env.PROCESS_CONTAINER_ID || '1776e960572610314f3f813a5dbb736d';
let BASIC_AUTH = process.env.PROCESS_BASIC_AUTH || 'Basic cHJvY2Vzc29yOnByb2Nlc3NvciM5OQ==';
let SERVICES_SERVER_HOST = process.env.SERVICES_SERVER_HOST + '/' + SUPERVISOR_ARTIFACT_URI || 'services-server-incident-demo.192.168.99.100.nip.io' + '/' + SUPERVISOR_ARTIFACT_URI;
let EXPOSED_SERVICES_SERVER_HOST = process.env.EXPOSED_SERVICES_SERVER_HOST + '/' + SUPERVISOR_ARTIFACT_URI;

let notifications_service = require('../controllers/notifications_service');
let claim_service = require('./claims_service');

let processAddPhoto = (instanceId, fileName, source, cb) => {
    console.log('app processAddPhoto');
    let updateInfo = {
        photoId: fileName,
        updateSource: source
    };

    claim_service.signalHumanTask(instanceId, 'Update%20Information', error => {
        if (!error) {
            claim_service.listReadyTasks(instanceId, 'Update Information', (error, taskId) => {
                if (!error) {
                    claim_service.updateInformation(taskId, updateInfo, error => {
                        if (!error) {
                            let notification = {
                                from: 'either',
                                when: new Date(),
                                message: 'ADD_COMMENT',
                                readableMessage: 'New photo added',
                                processId: instanceId
                            };
                            notifications_service.addResponderNotification(notification);
                            cb(null, 'SUCCESS');
                        } else {
                            let msg = 'Unable to add photo, error: ' + error;
                            console.error(error);
                            cb(msg);
                        }
                    });
                } else {
                    let msg = '0 Unable to list ready tasks, error: ' + error;
                    console.error(error);
                    cb(msg);
                }
            });
        } else {
            let msg = 'Unable to signal for human task, error: ' + error;
            console.error(error);
            cb(msg);
        }
    });
};

exports.startProcess = (req, res) => {
    console.log('app startProcess');
    let claim = req.body;
    let claimIncident = claim.incident;

    let incident = {
        'com.redhat.vizuri.demo.domain.Incident': {
            id: claimIncident.id,
            reporterUserId: claimIncident.reporterUserId,
            incidentType: claimIncident.type,
            description: claimIncident.description,
            incidentDate: claimIncident.incidentDate,
            buildingName: claimIncident.buildingName,
            stateCode: claimIncident.stateCode,
            zipCode: claimIncident.zipCode,
            severity: claimIncident.severity
        }
    };

    let questionnaire = {
        'com.redhat.vizuri.demo.domain.Questionnaire': {
            id: 1,
            name: claim.questionnaire.name,
            questions: [],
            answers: [],
            completedBy: null,
            completedDate: null
        }
    };

    let questionTemplate = {
        questionId: 'win-1',
        questionnaireId: 1,
        groupId: null,
        description: 'Is the crack larger than a quarter?',
        answerType: 'YES_NO',
        required: false,
        enabled: true,
        order: 1,
        options: []
    };

    let answerTemplate = {
        questionId: 'win-1',
        groupId: null,
        strValue: 'No'
    };

    let question, answer;

    for (let q of claim.questionnaire.questions) {
        question = JSON.parse(JSON.stringify(questionTemplate));
        question.questionId = q.questionId;
        question.description = q.description;
        question.enabled = q.enabled;
        question.order = q.order;
        questionnaire['com.redhat.vizuri.demo.domain.Questionnaire'].questions.push(question);
    }

    for (let a of claim.questionnaire.answers) {
        answer = JSON.parse(JSON.stringify(answerTemplate));
        answer.questionId = a.questionId;
        answer.strValue = a.strValue;
        questionnaire['com.redhat.vizuri.demo.domain.Questionnaire'].answers.push(answer);
    }

    let msg = {
        incident: incident,
        questionnaire: questionnaire
    };

    let options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + PROCESS_CONTAINER_ID + '/processes/processes.report-incident/instances',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'POST',
        json: msg
    };

    request(options, (error, response, body) => {
        if (!error && response.statusCode == 201) {
            let notification = {
                from: 'reporter',
                when: new Date(),
                message: 'NEW_CLAIM_CREATED',
                readableMessage: 'New claim created',
                processId: body
            };
            notifications_service.addResponderNotification(notification);
            return res.json(body);
        } else {
            res.json(error);
        }
    });
};

exports.addComment = (req, res) => {
    console.log('app addComment');
    var body = req.body;
    var instanceId = req.params.instanceId;
    var updateInfo = {
        comment: body.claimComments,
        updateSource: body.messageSource
    };
    claim_service.signalHumanTask(instanceId, 'Update%20Information', function (error) {
        if (!error) {
            claim_service.listReadyTasks(instanceId, 'Update Information', function (error, taskId) {
                if (!error) {
                    claim_service.updateInformation(taskId, updateInfo, function (error) {
                        console.log('after updateInformation taskId: ', taskId);
                        if (!error) {
                            var notification = {
                                from: 'either',
                                when: new Date(),
                                message: 'ADD_COMMENT',
                                readableMessage: 'New comment added',
                                processId: instanceId
                            };
                            notifications_service.addReporterNotification(notification);
                            res.json('SUCCESS');
                        }
                        else {
                            var msg = 'Unable to add comment, error: ' + error;
                            res.json(msg);
                        }
                    });
                }
                else {
                    var msg = 'Unable to list ready tasks, error: ' + error;
                    res.json(msg);
                }
            });
        }
        else {
            var msg = 'Unable to signal human task, error: ' + error;
            res.json(msg);
        }
    });
};

exports.performRemediation = (req, res) => {
    console.log('app performRemediation');
    var instanceId = req.params.instanceId;
    var complete = req.params.complete;
    var updateInfo = { completed: complete };
    claim_service.signalHumanTask(instanceId, 'Perform%20Remediation', function (error) {
        if (!error) {
            claim_service.listReadyTasks(instanceId, 'Perform Remediation', function (error, taskId) {
                if (!error) {
                    claim_service.updateInformation(taskId, updateInfo, function (error) {
                        if (!error) {
                            res.json('SUCCESS');
                        }
                        else {
                            var msg = 'Unable to add comment, error: ' + error;
                            res.json(msg);
                        }
                    });
                }
                else {
                    var msg = '2 Unable to list ready tasks, error: ' + error;
                    res.json(msg);
                }
            });
        }
        else {
            var msg = 'Unable to signal for human task, error: ' + error;
            res.json(msg);
        }
    });
};

exports.getExistingClaims = (req, res) => {
    console.log('app getExistingClaims');
    if (req.body) {
        let options = {
            url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/queries/processes/instances?status=1',
            headers: {
                'Accept': 'application/json',
                'Authorization': BASIC_AUTH
            },
            method: 'GET'
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let existingClaims = [];
                let claimCount = 0;
                let processes = JSON.parse(body)['process-instance'];
                let processCount = processes.length;
                if (processes && processCount > 0) {
                    for (let process of processes) {
                        claim_service.loadClaimDetails(process, claim => {
                            claimCount++;
                            if (claim != null || claim != undefined) {
                                claim.photos = [];
                                if (claim.incidentPhotoIds && claim.incidentPhotoIds.length > 0) {
                                    for (let p of claim.incidentPhotoIds) {
                                        let link = 'http://' + EXPOSED_SERVICES_SERVER_HOST + '/photos/' + claim.processId + '/' + p.replace(/'/g, '');
                                        console.log(link);
                                        claim.photos.push(link);
                                    }
                                }
                                existingClaims.push(claim);
                            }
                            if (claimCount === processCount) {
                                return res.json(existingClaims);
                            }
                        });
                    }
                } else {
                    return res.json(existingClaims);
                }
            } else {
                return res.status(500).json({ error: 'DB record retreival error!' });
            }
        });
    }
};

exports.acceptBase64Image = (req, res) => {
    console.log('app acceptBase64Image');
    var data = req.body;
    data = data.replace(/^data:image\/jpeg;base64,/, '');
    var filename = uuid();
    var instanceId = req.params.instanceId;
    var updateSource = req.params.messageSource;
    fs.writeFile('./dist/photos/' + filename + '.jpg', data, { encoding: 'base64', flag: 'w' }, function (error) {
        if (error) {
            console.error(error);
        }
        else {
            var options = {
                url: 'http://' + SERVICES_SERVER_HOST + '/photos/' + instanceId,
                headers: {
                    'Accept': 'application/json'
                },
                method: 'POST'
            };
            var filePost = request(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    processAddPhoto(instanceId, filename, updateSource, function () {
                        var photoURL = 'http://' + EXPOSED_SERVICES_SERVER_HOST + '/photos/' + instanceId + '/' + filename;
                        console.log(photoURL);
                        return res.status(201).send(photoURL);
                    });
                    fs.unlink('./dist/photos/' + filename + '.jpg', function (err) {
                        console.error(err);
                    });
                }
                else if (error) {
                    console.error(error);
                    res.json(error);
                }
                else {
                    console.log(body);
                    res.json(body);
                }
            });
            var form = filePost.form();
            form.append('file', fs.createReadStream('./dist/photos/' + filename + '.jpg'), {
                filename: filename,
                contentType: 'image/jpeg'
            });
        }
    });
};