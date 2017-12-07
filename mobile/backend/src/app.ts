import * as express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as request from 'request';
import * as http from 'http';
import * as multer from 'multer';
import * as fs from 'fs';

export class Server {

    app: any;
    port: number;
    host: string;
    jsonParser: any;
    PROCESS_SERVER_HOST: string;
    DECISION_SERVER_HOST: string;
    SERVICES_SERVER_HOST: string;
    PROCESS_CONTAINER_ID: string;
    DECISION_CONTAINER_ID: string;
    BASIC_AUTH: string;
    REQUEST_AUTHORIZATION: string;
    upload: multer.Instance;
    fs: any;

    constructor() {
        console.log('Inside app constructor');
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

    start() {
        this.app.listen(this.port, this.host, () => {
            console.log('App started at: ' + new Date() + ' on port: ' + this.port);
        });
    }

    private routes() {
        console.log('app routes');
        this.app.get('/api/v1/test', this.jsonParser, (req, res) => {
            console.log('app test');
            res.json({ message: 'test' });
        });

        this.app.post('/api/v1/bpms/startprocess', this.jsonParser, this.startProcess);
        this.app.post('/api/v1/bpms/add-comments/:instanceId', this.jsonParser, this.addComment);
        this.app.post('/api/v1/bpms/doadjuster/:instanceId/:complete', this.jsonParser, this.performRemediation);
        this.app.get('/v1/api/claims', this.jsonParser, this.getExistingClaims);
        this.app.post('/api/v1/bpms/customer-incident', this.jsonParser, this.createIncident);
        this.app.post('/api/v1/bpms/update-questions', this.jsonParser, this.updateQuestions);
        this.app.post('/api/v1/bpms/upload-photo/:instanceId/:fileName/:messageSource', this.upload.single('file'), this.claimAddPhoto);
    }

    private claimAddPhoto(req, res) {
        console.log('app claimAddPhoto');
        let fileName = req.file.originalname;
        let instanceId = req.params.instanceId;
        let updateSource = req.params.messageSource;

        let options = {
            url: 'http://' + this.SERVICES_SERVER_HOST + '/photos/' + instanceId,
            headers: {
                'Accept': 'application/json'
            },
            method: 'POST'
        };

        let filePost = request(options, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let data = JSON.parse(body);
                this.processAddPhoto(instanceId, fileName, updateSource, function () {
                    return res.json({ link: 'http://' + this.SERVICES_SERVER_HOST + '/photos/' + instanceId + '/' + fileName });
                });
            } else if (error) {
                res.json(error);
            } else {
                res.json(body);
            }
        });

        let form = filePost.form();
        form.append('file', fs.createReadStream(req.file.path), {
            filename: fileName,
            contentType: req.file.mimetype
        });
    }

    private processAddPhoto(instanceId, fileName, source, cb) {
        console.log('app processAddPhoto');
        let updateInfo = {
            photoId: fileName,
            updateSource: source
        };

        this.signalHumanTask(instanceId, 'Update%20Information', error => {
            if (!error) {
                this.listReadyTasks(instanceId, 'Update Information', (error, taskId) => {
                    if (!error) {
                        this.updateInformation(taskId, updateInfo, error => {
                            if (!error) {
                                cb(null, 'SUCCESS');
                            } else {
                                let msg = 'Unable to add photo, error: ' + error;
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
    }

    private createIncident(req, res) {
        console.log('app createIncident');
        let incidentData = req.body;
        let msg = {
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

        let options = {
            url: 'http://' + this.DECISION_SERVER_HOST + '/kie-server/services/rest/server/containers/instances/' + this.DECISION_CONTAINER_ID,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': this.REQUEST_AUTHORIZATION
            },
            method: 'POST',
            json: msg
        };

        request(options, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let questionnaire = body.result['execution-results'].results[0].value['org.drools.core.runtime.rule.impl.FlatQueryResults'].idFactHandleMaps.element[0].element[0].value['org.drools.core.common.DisconnectedFactHandle'].object['com.redhat.vizuri.demo.domain.Questionnaire'];
                return res.json(questionnaire);
            }
        });
    }

    private updateQuestions(req, res) {
        console.log('app updateQuestions');
        let questionnaire = req.body;
        let questionTemplate = {
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
        let answerTemplate = {
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
        let ruleCommands = [{
            'set-focus': {
                name: 'sync-answers'
            }
        }, {
            'fire-all-rules': {
                max: 100,
                'out-identifier': 'sync-answers-fired'
            }
        }];
        let msg = {
            lookup: 'summit17-ks',
            commands: new Array<any>()
        };

        let commands: Array<any> = [];
        let question;
        let answer;

        for (let q of questionnaire.questions) {
            question = JSON.parse(JSON.stringify(questionTemplate));
            let obj = question.insert.object['com.redhat.vizuri.demo.domain.Question'];
            obj.questionId = q.questionId;
            obj.description = q.description;
            obj.enabled = q.enabled;
            obj.order = q.order;
            let test: Array<string> = [];
            test.indexOf
            question.insert['out-identifier'] = 'question-' + (questionnaire.questions.indexOf(q) + 1);
            commands.push(question);
        }

        for (let a of questionnaire.answers) {
            answer = JSON.parse(JSON.stringify(answerTemplate));
            answer.insert['out-identifier'] = 'answer-' + (questionnaire.answers.indexOf(a) + 1);
            let obj = answer.insert.object['com.redhat.vizuri.demo.domain.Answer'];
            obj.questionId = a.questionId;
            obj.strValue = a.strValue;
            commands.push(answer);
        }

        msg.commands = commands.concat(ruleCommands);

        let options = {
            url: 'http://' + this.DECISION_SERVER_HOST + '/kie-server/services/rest/server/containers/instances/' + this.DECISION_CONTAINER_ID,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': this.REQUEST_AUTHORIZATION
            },
            method: 'POST',
            json: msg
        };

        request(options, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let facts = body.result['execution-results'].results;
                for (let fact of facts) {
                    if (fact.key.startsWith('question') === true) {
                        let obj = fact.value['com.redhat.vizuri.demo.domain.Question'];
                        for (let q of questionnaire.questions) {
                            if (q.questionId === obj.questionId) {
                                q.enabled = obj.enabled;
                            }
                        }
                    }
                }
                return res.json(questionnaire);
            } else {
                res.json(error);
            }
        });
    }

    private getExistingClaims(req, res) {
        console.log('app getExistingClaims');
        if (req.body) {
            let options = {
                url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/queries/processes/instances?status=1',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': this.BASIC_AUTH
                },
                method: 'GET'
            }
            request(options, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    let existingClaims = new Array<any>();
                    let claimCount = 0;
                    let processes = JSON.parse(body)['process-instance'];
                    let processCount = processes.length;
                    if (processes && processCount > 0) {
                        for (let process of processes) {
                            this.loadClaimDetails(process, claim => {
                                claimCount++;
                                if (claim != null || claim != undefined) {
                                    claim.photos = [];
                                    if (claim.incidentPhotoIds && claim.incidentPhotoIds.length > 0) {
                                        for (let p of claim.incidentPhotoIds) {
                                            let link = 'http://' + this.SERVICES_SERVER_HOST + '/photos/' + claim.processId + '/' + p.replace(/'/g, '');
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
    }

    private loadClaimDetails(process, cb) {
        console.log('app loadClaimDetails');
        let instanceId = process['process-instance-id'];
        let options = {
            url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + this.PROCESS_CONTAINER_ID + '/processes/instances/' + instanceId + '/letiables',
            headers: {
                'Accept': 'application/json',
                'Authorization': this.BASIC_AUTH
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
    }

    private startProcess(req, res) {
        console.log('app startProcess');
        let claim = req.body.claim;
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

        let question, answer: any;

        for (let q of claim.questionnaire.questions) {
            question = JSON.parse(JSON.stringify(questionTemplate));
            question.questionId = q.questionId;
            question.description = q.description;
            question.enabled = q.enabled;
            question.order = q.order;
            questionnaire['com.redhat.vizuri.demo.domain.Questionnaire'].questions.push(<never>question);
        }

        for (let a of claim.questionnaire.answers) {
            answer = JSON.parse(JSON.stringify(answerTemplate));
            answer.questionId = a.questionId;
            answer.strValue = a.strValue;
            questionnaire['com.redhat.vizuri.demo.domain.Questionnaire'].answers.push(<never>answer);
        }

        let msg = {
            incident: incident,
            questionnaire: questionnaire
        };

        let options = {
            url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + this.PROCESS_CONTAINER_ID + '/processes/processes.report-incident/instances',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': this.BASIC_AUTH
            },
            method: 'POST',
            json: msg
        };

        request(options, (error, response, body) => {
            if (!error && response.statusCode == 201) {
                return res.json(body);
            } else {
                res.json(error);
            }
        });
    }

    private addComment(req, res) {
        console.log('app addComment');
        let body = req.body;
        let instanceId = req.params.instanceId;
        let updateInfo = {
            comment: body.claimComments,
            updateSource: body.messageSource
        };

        this.signalHumanTask(instanceId, 'Update%20Information', error => {
            if (!error) {
                this.listReadyTasks(instanceId, 'Update Information', (error, taskId) => {
                    if (!error) {
                        this.updateInformation(taskId, updateInfo, error => {
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
                let msg = 'Unable to signal human task, error: ' + error;
                res.json(msg);
            }
        });
    }

    private performRemediation(req, res) {
        console.log('app performRemediation');
        let body = req.body;
        let instanceId = req.params.instanceId;
        let complete = req.params.complete;
        let updateInfo = { completed: complete };

        this.signalHumanTask(instanceId, 'Perform%20Remediation', error => {
            if (!error) {
                this.listReadyTasks(instanceId, 'Perform Remediation', (error, taskId) => {
                    if (!error) {
                        this.updateInformation(taskId, updateInfo, error => {
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
    }

    private signalHumanTask(instanceId, type, cb) {
        console.log('app signalHumanTask');
        let options = {
            url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + this.PROCESS_CONTAINER_ID + '/processes/instances/signal/' + type + '?instanceId=' + instanceId,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': this.BASIC_AUTH
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
    }

    private listReadyTasks(instanceId, type, cb) {
        console.log('app listReadyTasks');
        let options = {
            url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/queries/tasks/instances/process/' + instanceId + '?status=Ready',
            headers: {
                'Accept': 'application/json',
                'Authorization': this.BASIC_AUTH
            },
            method: 'GET'
        };

        request(options, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let data = JSON.parse(body);
                let tasks = data['task-summary'];
                if (tasks != undefined) {
                    for (let task of tasks) {
                        if (task['task-name'] === type && task['task-name'] === 'Ready') {
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

    private updateInformation(taskId, updateInfo, cb) {
        console.log('app updateInformation');
        let options = {
            url: 'http://' + this.PROCESS_SERVER_HOST + '/kie-server/services/rest/server/containers/' + this.PROCESS_CONTAINER_ID + '/tasks/' + taskId + '/states/completed?auto-progress=true',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': this.BASIC_AUTH
            },
            method: 'PUT',
            json: updateInfo
        };

        request(options, (error, response, body) => {
            if (!error && response.statusCode == 201) {
                cb(null);
            } else {
                cb(error);
            }
        });
    }

}

let server = new Server();
server.start();