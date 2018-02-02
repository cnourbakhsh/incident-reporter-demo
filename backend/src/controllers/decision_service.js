let request = require('request');

let DECISION_SERVER_HOST = process.env.DECISION_SERVER_HOST || 'decision-server-incident-demo.192.168.99.100.nip.io';
let DECISION_CONTAINER_ID = process.env.DECISION_CONTAINER_ID || '4c1342a8827bf46033cb95f0bdf27f0b';
let REQUEST_AUTHORIZATION = process.env.DECISION_BASIC_AUTH || 'Basic ZGVjaWRlcjpkZWNpZGVyIzk5';

exports.updateQuestions = (req, res) => {
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
        commands: []
    };

    let commands = [];
    let question;
    let answer;

    for (let q of questionnaire.questions) {
        question = JSON.parse(JSON.stringify(questionTemplate));
        let obj = question.insert.object['com.redhat.vizuri.demo.domain.Question'];
        obj.questionId = q.questionId;
        obj.description = q.description;
        obj.enabled = q.enabled;
        obj.order = q.order;
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
        url: 'http://' + DECISION_SERVER_HOST + '/kie-server/services/rest/server/containers/instances/' + DECISION_CONTAINER_ID,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': REQUEST_AUTHORIZATION
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

exports.createIncident = (req, res) => {
    console.log('app createIncident');
    let incidentData = req.body;
    let msg = {
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

    let options = {
        url: 'http://' + DECISION_SERVER_HOST + '/kie-server/services/rest/server/containers/instances/' + DECISION_CONTAINER_ID,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': REQUEST_AUTHORIZATION
        },
        method: 'POST',
        json: msg
    };

    request(options, (error, response, body) => {
        if (!error && response.statusCode == 200 && body.result) {
            let questionnaire = body.result['execution-results'].results[0].value['org.drools.core.runtime.rule.impl.FlatQueryResults'].idFactHandleMaps.element[0].element[0].value['org.drools.core.common.DisconnectedFactHandle'].object['com.redhat.vizuri.demo.domain.Questionnaire'];
            return res.json(questionnaire);
        } else {
            return res.status(500).json({ message: 'An error has occured!' });
        }
    });
};