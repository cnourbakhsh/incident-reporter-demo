"use strict";
exports.__esModule = true;
var express = require("express");
var cors = require("cors");
var bodyParser = require("body-parser");
var request = require("request");
var multer = require("multer");
var fs = require("fs");
var Server = /** @class */ (function () {
    function Server() {
        this.app = express();
        this.app.use(cors());
        this.port = 7001;
        this.host = '0.0.0.0';
        this.PROCESS_SERVER_HOST = process.env.PROCESS_SERVER_HOST || 'localhost:8080';
        this.DECISION_SERVER_HOST = process.env.DECISION_SERVER_HOST || 'localhost:8080';
        this.SERVICES_SERVER_HOST = process.env.SERVICES_SERVER_HOST || 'localhost:8080';
        this.PROCESS_CONTAINER_ID = process.env.PROCESS_CONTAINER_ID || 'ProcessContainer';
        this.DECISION_CONTAINER_ID = process.env.DECISION_CONTAINER_ID || 'DecisionContainer';
        this.BASIC_AUTH = process.env.PROCESS_BASIC_AUTH || 'Basic cHJvY2Vzc29yOnByb2Nlc3NvciM5OQ==';
        this.REQUEST_AUTHORIZATION = process.env.DECISION_BASIC_AUTH || 'Basic ZGVjaWRlcjpkZWNpZGVyIzk5';
        this.upload = multer({ dest: 'uploads/' });
        this.jsonParser = bodyParser.json();
        this.routes();
    }
    Server.prototype.start = function () {
        var _this = this;
        this.app.listen(this.port, this.host, function () {
            console.log('App started at: ' + new Date() + ' on port: ' + _this.port);
        });
    };
    Server.prototype.routes = function () {
        this.app.post('/api/v1/bpms/startprocess', this.jsonParser, this.startProcess);
        this.app.post('/api/v1/bpms/add-comments/:instanceId', this.jsonParser, this.addComment);
        this.app.post('/api/v1/bpms/doadjuster/:instanceId/:complete', this.jsonParser, this.performRemediation);
        this.app.get('/v1/api/claims', this.jsonParser, this.getExistingClaims);
        this.app.post('/api/v1/bpms/customer-incident', this.jsonParser, this.createIncident);
        this.app.post('/api/v1/bpms/update-questions', this.jsonParser, this.updateQuestions);
        this.app.post('/api/v1/bpms/upload-photo/:instanceId/:fileName/:messageSource', this.upload.single('file'), this.claimAddPhoto);
    };
    Server.prototype.claimAddPhoto = function (req, res) {
        var _this = this;
        var fileName = req.file.originalname;
        var instanceId = req.params.instanceId;
        var updateSource = req.params.messageSource;
        var options = {
            url: 'http://' + this.SERVICES_SERVER_HOST + '/photos/' + instanceId,
            headers: {
                'Accept': 'application/json'
            },
            method: 'POST'
        };
        var filePost = request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var data = JSON.parse(body);
                _this.processAddPhoto(instanceId, fileName, updateSource, function () {
                    return res.json({ link: 'http://' + this.SERVICES_SERVER_HOST + '/photos/' + instanceId + '/' + fileName });
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
    Server.prototype.processAddPhoto = function (instanceId, fileName, source, cb) {
        var _this = this;
        var updateInfo = {
            photoId: fileName,
            updateSource: source
        };
        this.signalHumanTask(instanceId, 'Update%20Information', function (error) {
            if (!error) {
                _this.listReadyTasks(instanceId, 'Update Information', function (error, taskId) {
                    if (!error) {
                        _this.updateInformation(taskId, updateInfo, function (error) {
                            if (!error) {
                                cb(null, 'SUCCESS');
                            }
                            else {
                                var msg = 'Unable to add photo, error: ' + error;
                                cb(msg);
                            }
                        });
                    }
                    else {
                        var msg = 'Unable to list ready tasks, error: ' + error;
                        cb(msg);
                    }
                });
            }
            else {
                var msg = 'Unable to signal for human task, error: ' + error;
                cb(msg);
            }
        });
    };
    Server.prototype.createIncident = function (req, res) {
        var incidentData = req.body;
        var msg = {
            lookup: 'summit17-ks',
            commands: [{
                    insert: {
                        object: {
                            'com.redhat.vizuri.demo.domain.Incident': {
                                id: incidentData.id,
                                reporterUserId: incidentData.reporterUserId,
                                incidentType: incidentData.type,
                                description: incidentData.description,
                                incidentDate: incidentData.incidentDate,
                                buildingName: incidentData.buildingName,
                                stateCode: incidentData.stateCode,
                                zipCode: incidentData.postalCode
                            }
                        },
                        disconnected: true,
                        'out-identifier': 'incident',
                        'return-object': false,
                        'entry-point': 'DEFAULT'
                    }
                }, {
                    'set-focus': {
                        name: 'construct-customer-questions'
                    }
                }, {
                    'fire-all-rules': {
                        max: -1,
                        'out-identifier': 'construct-fired'
                    }
                }, {
                    'set-focus': {
                        name: 'question-cleanup'
                    }
                }, {
                    'fire-all-rules': {
                        max: -1,
                        'out-identifier': 'cleanup-fired'
                    }
                }, {
                    query: {
                        name: 'get-questionnaires',
                        arguments: [],
                        'out-identifier': 'questionnaires'
                    }
                }]
        };
        var options = {
            url: 'http://' + this.DECISION_SERVER_HOST + '/kie-server/services/rest/server/containers/instances/' + this.DECISION_CONTAINER_ID,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': this.REQUEST_AUTHORIZATION
            },
            method: 'POST',
            json: msg
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var questionnaire = body.result['execution-results'].results[0].value['org.drools.core.runtime.rule.impl.FlatQueryResults'].idFactHandleMaps.element[0].element[0].value['org.drools.core.common.DisconnectedFactHandle'].object['com.redhat.vizuri.demo.domain.Questionnaire'];
                return res.json(questionnaire);
            }
        });
    };
    Server.prototype.updateQuestions = function (req, res) {
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
                        "delete": false
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
            commands: []
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
            url: 'http://' + this.DECISION_SERVER_HOST + '/kie-server/services/rest/server/containers/instances/' + this.DECISION_CONTAINER_ID,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': this.REQUEST_AUTHORIZATION
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
        var _this = this;
        if (req.body) {
            var options = {
                url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/queries/processes/instances?status=1',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': this.BASIC_AUTH
                },
                method: 'GET'
            };
            request(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var existingClaims_1 = [];
                    var claimCount_1 = 0;
                    var processes = JSON.parse(body)['process-instance'];
                    var processCount_1 = processes.length;
                    if (processes && processCount_1 > 0) {
                        for (var _i = 0, processes_1 = processes; _i < processes_1.length; _i++) {
                            var process_1 = processes_1[_i];
                            _this.loadClaimDetails(process_1, function (claim) {
                                claimCount_1++;
                                if (claim != null || claim != undefined) {
                                    claim.photos = [];
                                    if (claim.incidentPhotoIds && claim.incidentPhotoIds.length > 0) {
                                        for (var _i = 0, _a = claim.incidentPhotoIds; _i < _a.length; _i++) {
                                            var p = _a[_i];
                                            var link = 'http://' + _this.SERVICES_SERVER_HOST + '/photos/' + claim.processId + '/' + p.replace(/'/g, '');
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
    Server.prototype.loadClaimDetails = function (process, cb) {
        var instanceId = process['process-instance-id'];
        var options = {
            url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + this.PROCESS_CONTAINER_ID + '/processes/instances/' + instanceId + '/letiables',
            headers: {
                'Accept': 'application/json',
                'Authorization': this.BASIC_AUTH
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
    Server.prototype.startProcess = function (req, res) {
        var claim = req.body.claim;
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
            url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + this.PROCESS_CONTAINER_ID + '/processes/processes.report-incident/instances',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': this.BASIC_AUTH
            },
            method: 'POST',
            json: msg
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 201) {
                return res.json(body);
            }
            else {
                res.json(error);
            }
        });
    };
    Server.prototype.addComment = function (req, res) {
        var _this = this;
        var body = req.body;
        var instanceId = req.params.instanceId;
        var updateInfo = {
            comment: body.claimComments,
            updateSource: body.messageSource
        };
        this.signalHumanTask(instanceId, 'Update%20Information', function (error) {
            if (!error) {
                _this.listReadyTasks(instanceId, 'Update Information', function (error, taskId) {
                    if (!error) {
                        _this.updateInformation(taskId, updateInfo, function (error) {
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
        var _this = this;
        var body = req.body;
        var instanceId = req.params.instanceId;
        var complete = req.params.complete;
        var updateInfo = { completed: complete };
        this.signalHumanTask(instanceId, 'Perform%20Remediation', function (error) {
            if (!error) {
                _this.listReadyTasks(instanceId, 'Perform Remediation', function (error, taskId) {
                    if (!error) {
                        _this.updateInformation(taskId, updateInfo, function (error) {
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
                        var msg = 'Unable to list ready tasks, error: ' + error;
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
    Server.prototype.signalHumanTask = function (instanceId, type, cb) {
        var options = {
            url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + this.PROCESS_CONTAINER_ID + '/processes/instances/signal/' + type + '?instanceId=' + instanceId,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': this.BASIC_AUTH
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
    Server.prototype.listReadyTasks = function (instanceId, type, cb) {
        var options = {
            url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/queries/tasks/instances/process/' + instanceId + '?status=Ready',
            headers: {
                'Accept': 'application/json',
                'Authorization': this.BASIC_AUTH
            },
            method: 'GET'
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var data = JSON.parse(body);
                var tasks = data['task-summary'];
                if (tasks != undefined) {
                    for (var _i = 0, tasks_1 = tasks; _i < tasks_1.length; _i++) {
                        var task = tasks_1[_i];
                        if (task['task-name'] === type && task['task-name'] === 'Ready') {
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
    Server.prototype.updateInformation = function (taskId, updateInfo, cb) {
        var options = {
            url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + this.PROCESS_CONTAINER_ID + '/tasks/' + taskId + '/states/completed?auto-progress=true',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': this.BASIC_AUTH
            },
            method: 'PUT',
            json: updateInfo
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 201) {
                cb(null);
            }
            else {
                cb(error);
            }
        });
    };
    return Server;
}());
exports.Server = Server;
var server = new Server();
server.start();
