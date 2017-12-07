let process_server = require('../controllers/process_server');
let claim_services = require('../controllers/claim_services');
let decision_server = require('../controllers/decision_server');

module.exports = function (app, jsonParser, upload) {
    console.log('application routes');
    app.get('/api/v1/test', jsonParser, (req, res) => {
        res.json({ message: 'test' });
    });
    app.post('/api/v1/bpms/startprocess', jsonParser, process_server.startProcess);
    app.post('/api/v1/bpms/add-comments/:instanceId', jsonParser, process_server.addComment);
    app.post('/api/v1/bpms/doadjuster/:instanceId/:complete', jsonParser, process_server.performRemediation);
    app.get('/api/v1/claims', jsonParser, process_server.getExistingClaims);
    app.post('/api/v1/bpms/customer-incident', jsonParser, decision_server.createIncident);
    app.post('/api/v1/bpms/update-questions', jsonParser, decision_server.updateQuestions);
    app.post('/api/v1/bpms/upload-photo/:instanceId/:fileName/:messageSource', upload.single('file'), claim_services.addPhoto);
};