"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var cors = require("cors");
var bodyParser = require("body-parser");
var request = require("request");
var multer = require("multer");
var fs = require("fs");
var uuid = require("uuid/v1");
var SUPERVISOR_ARTIFACT_URI = 'supervisor-ui';
var PROCESS_SERVER_HOST = process.env.PROCESS_SERVER_HOST || 'process-server-incident-demo.192.168.99.100.nip.io';
var DECISION_SERVER_HOST = process.env.DECISION_SERVER_HOST || 'decision-server-incident-demo.192.168.99.100.nip.io';
var SERVICES_SERVER_HOST = process.env.SERVICES_SERVER_HOST + '/' + SUPERVISOR_ARTIFACT_URI || 'services-server-incident-demo.192.168.99.100.nip.io' + '/' + SUPERVISOR_ARTIFACT_URI;
var EXPOSED_SERVICES_SERVER_HOST = process.env.EXPOSED_SERVICES_SERVER_HOST + '/' + SUPERVISOR_ARTIFACT_URI;
var PROCESS_CONTAINER_ID = process.env.PROCESS_CONTAINER_ID || '1776e960572610314f3f813a5dbb736d';
var DECISION_CONTAINER_ID = process.env.DECISION_CONTAINER_ID || '4c1342a8827bf46033cb95f0bdf27f0b';
var BASIC_AUTH = process.env.PROCESS_BASIC_AUTH || 'Basic cHJvY2Vzc29yOnByb2Nlc3NvciM5OQ==';
var REQUEST_AUTHORIZATION = process.env.DECISION_BASIC_AUTH || 'Basic ZGVjaWRlcjpkZWNpZGVyIzk5';
var reporterNotifications = [];
var responderNotifications = [];
var loadClaimDetails = function (process, cb) {
    console.log('app loadClaimDetails');
    var instanceId = process['process-instance-id'];
    var options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + PROCESS_CONTAINER_ID + '/processes/instances/' + instanceId + '/variables',
        headers: {
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'GET'
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var claim = JSON.parse(body);
            claim.processId = instanceId;
            cb(claim);
        }
        else {
            cb(null);
        }
    });
};
var signalHumanTask = function (instanceId, type, cb) {
    console.log('app signalHumanTask');
    var options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + PROCESS_CONTAINER_ID + '/processes/instances/signal/' + type + '?instanceId=' + instanceId,
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
        }
        else {
            cb(error);
        }
    });
};
var listReadyTasks = function (instanceId, type, cb) {
    console.log('app listReadyTasks');
    var options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/queries/tasks/instances/process/' + instanceId + '?status=Ready',
        headers: {
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'GET'
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            var tasks = data['task-summary'];
            if (tasks) {
                for (var _i = 0, tasks_1 = tasks; _i < tasks_1.length; _i++) {
                    var task = tasks_1[_i];
                    if (task['task-name'] === type && task['task-status'] === 'Ready') {
                        return cb(null, task['task-id']);
                    }
                }
                return cb(new Error('Unable to find task'));
            }
            else {
                cb(null);
            }
        }
        else {
            cb(error);
        }
    });
};
var updateInformation = function (taskId, updateInfo, cb) {
    console.log('app updateInformation');
    var options = {
        url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + PROCESS_CONTAINER_ID + '/tasks/' + taskId + '/states/completed?user=dummy&auto-progress=true',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': BASIC_AUTH
        },
        method: 'PUT',
        json: updateInfo
    };
    request(options, function (error, response, body) {
        if (response.statusCode != 201) {
            cb(new Error('Unsuccesful process task update, error: ' + response.body));
        }
        else {
            cb(null);
        }
    });
};
var processAddPhoto = function (instanceId, fileName, source, cb) {
    console.log('app processAddPhoto');
    var updateInfo = {
        photoId: fileName,
        updateSource: source
    };
    signalHumanTask(instanceId, 'Update%20Information', function (error) {
        if (!error) {
            listReadyTasks(instanceId, 'Update Information', function (error, taskId) {
                if (!error) {
                    updateInformation(taskId, updateInfo, function (error) {
                        if (!error) {
                            var notification = {
                                from: 'either',
                                when: new Date(),
                                message: 'ADD_COMMENT',
                                readableMessage: 'New photo added',
                                processId: instanceId
                            };
                            responderNotifications.push(notification);
                            cb(null, 'SUCCESS');
                        }
                        else {
                            var msg = 'Unable to add photo, error: ' + error;
                            console.error(error);
                            cb(msg);
                        }
                    });
                }
                else {
                    var msg = '0 Unable to list ready tasks, error: ' + error;
                    console.error(error);
                    cb(msg);
                }
            });
        }
        else {
            var msg = 'Unable to signal for human task, error: ' + error;
            console.error(error);
            cb(msg);
        }
    });
};
var Server = (function () {
    function Server() {
        console.log('Inside app constructor');
        this.app = express();
        this.app.use(cors());
        this.port = +process.env.OPENSHIFT_NODEJS_PORT || 7001;
        this.host = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
        var storage = multer.memoryStorage();
        this.upload = multer({ storage: storage });
        this.jsonParser = bodyParser.json();
        this.routes();
    }
    Server.prototype.start = function () {
        var _this = this;
        fs.mkdir('./dist/photos', function (err) {
            if (err) {
                console.error(err);
            }
        });
        this.app.listen(this.port, this.host, function () {
            console.log('App started at: ' + new Date() + ' on port: ' + _this.port);
        });
    };
    Server.prototype.routes = function () {
        console.log('app routes');
        this.app.post('/api/v1/bpms/startprocess', this.jsonParser, this.startProcess);
        this.app.post('/api/v1/bpms/add-comments/:instanceId', this.jsonParser, this.addComment);
        this.app.post('/api/v1/bpms/doadjuster/:instanceId/:complete', this.jsonParser, this.performRemediation);
        this.app.get('/api/v1/claims', this.jsonParser, this.getExistingClaims);
        this.app.post('/api/v1/bpms/customer-incident', this.jsonParser, this.createIncident);
        this.app.post('/api/v1/bpms/update-questions', this.jsonParser, this.updateQuestions);
        this.app.post('/api/v1/bpms/upload-photo/:instanceId/:fileName/:messageSource', this.upload.single('file'), this.claimAddPhoto);
        this.app.post('/api/v1/bpms/accept-base64-image/:instanceId/:fileName/:messageSource', bodyParser.text({ type: 'text/plain', limit: '1000000000' }), this.acceptBase64Image);
        this.app.get('/api/v1/notifications/reporter', this.jsonParser, this.getReporterNotifications);
        this.app.get('/api/v1/notifications/responder', this.jsonParser, this.getResponderNotifications);
        this.app.get('/api/v1/notifications', this.jsonParser, this.getNotifications);
    };
    Server.prototype.getNotifications = function (req, res) {
        console.log('app getNotifications');
        return res.send(reporterNotifications.concat(responderNotifications));
    };
    Server.prototype.getReporterNotifications = function (req, res) {
        console.log('app getReporterNotifications');
        return res.send(reporterNotifications);
    };
    Server.prototype.getResponderNotifications = function (req, res) {
        console.log('app getResponderNotifications');
        return res.send(responderNotifications);
    };
    Server.prototype.acceptBase64Image = function (req, res) {
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
    Server.prototype.claimAddPhoto = function (req, res) {
        console.log('app claimAddPhoto');
        var fileName = req.file.originalname;
        var instanceId = req.params.instanceId;
        var updateSource = req.params.messageSource;
        var options = {
            url: 'http://' + SERVICES_SERVER_HOST + '/photos/' + instanceId,
            headers: {
                'Accept': 'application/json'
            },
            method: 'POST'
        };
        var filePost = request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                processAddPhoto(instanceId, fileName, updateSource, function () {
                    return res.json({ link: 'http://' + SERVICES_SERVER_HOST + '/photos/' + instanceId + '/' + fileName });
                });
            }
            else if (error) {
                res.json(error);
            }
            else {
                res.json(body);
            }
        });
        var form = filePost.form();
        form.append('file', fs.createReadStream(req.file.path), {
            filename: fileName,
            contentType: req.file.mimetype
        });
    };
    Server.prototype.createIncident = function (req, res) {
        console.log('app createIncident');
        var incidentData = req.body;
        var msg = {
            'lookup': 'summit17-ks',
            'commands': [{
                    'insert': {
                        'object': {
                            'com.redhat.vizuri.demo.domain.Incident': {
                                'id': incidentData.id,
                                'reporterUserId': incidentData.reporterUserId,
                                'incidentType': incidentData.type,
                                'description': incidentData.description,
                                'incidentDate': incidentData.incidentDate,
                                'buildingName': incidentData.buildingName,
                                'stateCode': incidentData.stateCode,
                                'zipCode': incidentData.postalCode
                            }
                        },
                        'disconnected': true,
                        'out-identifier': 'incident',
                        'return-object': false,
                        'entry-point': 'DEFAULT'
                    }
                }, {
                    'set-focus': {
                        'name': 'construct-customer-questions'
                    }
                }, {
                    'fire-all-rules': {
                        'max': -1,
                        'out-identifier': 'construct-fired'
                    }
                }, {
                    'set-focus': {
                        'name': 'question-cleanup'
                    }
                }, {
                    'fire-all-rules': {
                        'max': -1,
                        'out-identifier': 'cleanup-fired'
                    }
                }, {
                    'query': {
                        'name': 'get-questionnaires',
                        'arguments': [],
                        'out-identifier': 'questionnaires'
                    }
                }]
        };
        var options = {
            url: 'http://' + DECISION_SERVER_HOST + '/kie-server/services/rest/server/containers/instances/' + DECISION_CONTAINER_ID,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': REQUEST_AUTHORIZATION
            },
            method: 'POST',
            json: msg
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200 && body.result) {
                var questionnaire = body.result['execution-results'].results[0].value['org.drools.core.runtime.rule.impl.FlatQueryResults'].idFactHandleMaps.element[0].element[0].value['org.drools.core.common.DisconnectedFactHandle'].object['com.redhat.vizuri.demo.domain.Questionnaire'];
                return res.json(questionnaire);
            }
            else {
                return res.status(500).json({ message: 'An error has occured!' });
            }
        });
    };
    Server.prototype.updateQuestions = function (req, res) {
        console.log('app updateQuestions');
        var questionnaire = req.body;
        var questionTemplate = {
            insert: {
                object: {
                    'com.redhat.vizuri.demo.domain.Question': {
                        questionId: 'win-1',
                        questionnaireId: 1,
                        groupId: null,
                        description: 'Is the crack larger than a quarter?',
                        answerType: 'YES_NO',
                        required: false,
                        enabled: true,
                        order: 1,
                        options: []
                    }
                },
                disconnected: false,
                'out-identifier': 'question-1',
                'return-object': true,
                'entry-point': 'DEFAULT'
            }
        };
        var answerTemplate = {
            insert: {
                object: {
                    'com.redhat.vizuri.demo.domain.Answer': {
                        questionId: 'win-1',
                        groupId: null,
                        strValue: 'Yes',
                        delete: false
                    }
                },
                disconnected: false,
                'out-identifier': 'answer',
                'return-object': true,
                'entry-point': 'DEFAULT'
            }
        };
        var ruleCommands = [{
                'set-focus': {
                    name: 'sync-answers'
                }
            }, {
                'fire-all-rules': {
                    max: 100,
                    'out-identifier': 'sync-answers-fired'
                }
            }];
        var msg = {
            lookup: 'summit17-ks',
            commands: new Array()
        };
        var commands = [];
        var question;
        var answer;
        for (var _i = 0, _a = questionnaire.questions; _i < _a.length; _i++) {
            var q = _a[_i];
            question = JSON.parse(JSON.stringify(questionTemplate));
            var obj = question.insert.object['com.redhat.vizuri.demo.domain.Question'];
            obj.questionId = q.questionId;
            obj.description = q.description;
            obj.enabled = q.enabled;
            obj.order = q.order;
            var test = [];
            test.indexOf;
            question.insert['out-identifier'] = 'question-' + (questionnaire.questions.indexOf(q) + 1);
            commands.push(question);
        }
        for (var _b = 0, _c = questionnaire.answers; _b < _c.length; _b++) {
            var a = _c[_b];
            answer = JSON.parse(JSON.stringify(answerTemplate));
            answer.insert['out-identifier'] = 'answer-' + (questionnaire.answers.indexOf(a) + 1);
            var obj = answer.insert.object['com.redhat.vizuri.demo.domain.Answer'];
            obj.questionId = a.questionId;
            obj.strValue = a.strValue;
            commands.push(answer);
        }
        msg.commands = commands.concat(ruleCommands);
        var options = {
            url: 'http://' + DECISION_SERVER_HOST + '/kie-server/services/rest/server/containers/instances/' + DECISION_CONTAINER_ID,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': REQUEST_AUTHORIZATION
            },
            method: 'POST',
            json: msg
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var facts = body.result['execution-results'].results;
                for (var _i = 0, facts_1 = facts; _i < facts_1.length; _i++) {
                    var fact = facts_1[_i];
                    if (fact.key.startsWith('question') === true) {
                        var obj = fact.value['com.redhat.vizuri.demo.domain.Question'];
                        for (var _a = 0, _b = questionnaire.questions; _a < _b.length; _a++) {
                            var q = _b[_a];
                            if (q.questionId === obj.questionId) {
                                q.enabled = obj.enabled;
                            }
                        }
                    }
                }
                return res.json(questionnaire);
            }
            else {
                res.json(error);
            }
        });
    };
    Server.prototype.getExistingClaims = function (req, res) {
        console.log('app getExistingClaims');
        if (req.body) {
            var options = {
                url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/queries/processes/instances?status=1',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': BASIC_AUTH
                },
                method: 'GET'
            };
            request(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var existingClaims_1 = new Array();
                    var claimCount_1 = 0;
                    var processes = JSON.parse(body)['process-instance'];
                    var processCount_1 = processes.length;
                    if (processes && processCount_1 > 0) {
                        for (var _i = 0, processes_1 = processes; _i < processes_1.length; _i++) {
                            var process_1 = processes_1[_i];
                            loadClaimDetails(process_1, function (claim) {
                                claimCount_1++;
                                if (claim != null || claim != undefined) {
                                    claim.photos = [];
                                    if (claim.incidentPhotoIds && claim.incidentPhotoIds.length > 0) {
                                        for (var _i = 0, _a = claim.incidentPhotoIds; _i < _a.length; _i++) {
                                            var p = _a[_i];
                                            var link = 'http://' + EXPOSED_SERVICES_SERVER_HOST + '/photos/' + claim.processId + '/' + p.replace(/'/g, '');
                                            console.log(link);
                                            claim.photos.push(link);
                                        }
                                    }
                                    existingClaims_1.push(claim);
                                }
                                if (claimCount_1 === processCount_1) {
                                    return res.json(existingClaims_1);
                                }
                            });
                        }
                    }
                    else {
                        return res.json(existingClaims_1);
                    }
                }
                else {
                    return res.status(500).json({ error: 'DB record retreival error!' });
                }
            });
        }
    };
    Server.prototype.startProcess = function (req, res) {
        console.log('app startProcess');
        var claim = req.body;
        var claimIncident = claim.incident;
        var incident = {
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
        var questionnaire = {
            'com.redhat.vizuri.demo.domain.Questionnaire': {
                id: 1,
                name: claim.questionnaire.name,
                questions: [],
                answers: [],
                completedBy: null,
                completedDate: null
            }
        };
        var questionTemplate = {
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
        var answerTemplate = {
            questionId: 'win-1',
            groupId: null,
            strValue: 'No'
        };
        var question, answer;
        for (var _i = 0, _a = claim.questionnaire.questions; _i < _a.length; _i++) {
            var q = _a[_i];
            question = JSON.parse(JSON.stringify(questionTemplate));
            question.questionId = q.questionId;
            question.description = q.description;
            question.enabled = q.enabled;
            question.order = q.order;
            questionnaire['com.redhat.vizuri.demo.domain.Questionnaire'].questions.push(question);
        }
        for (var _b = 0, _c = claim.questionnaire.answers; _b < _c.length; _b++) {
            var a = _c[_b];
            answer = JSON.parse(JSON.stringify(answerTemplate));
            answer.questionId = a.questionId;
            answer.strValue = a.strValue;
            questionnaire['com.redhat.vizuri.demo.domain.Questionnaire'].answers.push(answer);
        }
        var msg = {
            incident: incident,
            questionnaire: questionnaire
        };
        var options = {
            url: 'http://' + PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + PROCESS_CONTAINER_ID + '/processes/processes.report-incident/instances',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': BASIC_AUTH
            },
            method: 'POST',
            json: msg
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 201) {
                var notification = {
                    from: 'reporter',
                    when: new Date(),
                    message: 'NEW_CLAIM_CREATED',
                    readableMessage: 'New claim created',
                    processId: body
                };
                responderNotifications.push(notification);
                return res.json(body);
            }
            else {
                res.json(error);
            }
        });
    };
    Server.prototype.addComment = function (req, res) {
        console.log('app addComment');
        var body = req.body;
        var instanceId = req.params.instanceId;
        var updateInfo = {
            comment: body.claimComments,
            updateSource: body.messageSource
        };
        signalHumanTask(instanceId, 'Update%20Information', function (error) {
            if (!error) {
                listReadyTasks(instanceId, 'Update Information', function (error, taskId) {
                    if (!error) {
                        updateInformation(taskId, updateInfo, function (error) {
                            console.log('after updateInformation taskId: ', taskId);
                            if (!error) {
                                var notification = {
                                    from: 'either',
                                    when: new Date(),
                                    message: 'ADD_COMMENT',
                                    readableMessage: 'New comment added',
                                    processId: instanceId
                                };
                                reporterNotifications.push(notification);
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
    Server.prototype.performRemediation = function (req, res) {
        console.log('app performRemediation');
        var instanceId = req.params.instanceId;
        var complete = req.params.complete;
        var updateInfo = { completed: complete };
        signalHumanTask(instanceId, 'Perform%20Remediation', function (error) {
            if (!error) {
                listReadyTasks(instanceId, 'Perform Remediation', function (error, taskId) {
                    if (!error) {
                        updateInformation(taskId, updateInfo, function (error) {
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
    return Server;
}());
exports.Server = Server;
var server = new Server();
server.start();
