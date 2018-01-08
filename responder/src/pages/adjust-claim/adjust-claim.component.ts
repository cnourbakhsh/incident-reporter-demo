import { Component, OnInit } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Claim } from '../../objects/Claim';
import { ClaimService } from '../../services/claims.service';
import { environment } from '../../services/environment';

@Component({
  selector: 'existing-claims',
  templateUrl: 'adjust-claim.component.html'
})
export class AdjustClaimComponent implements OnInit {

  claim: Claim;
  task: any = {};

  constructor(private navCtrl: NavController, private navParams: NavParams, private claimService: ClaimService) { }

  ngOnInit(): void {
    this.claim = this.navParams.data;
  }

  onClose(): void {
    this.navCtrl.pop();
  }

  onComplete(): void {
    this.task.task_complete = true;
    this.task.task_approved = true;
    this.claim.approved = true;
    this.claim.questionnaire.completedDate = new Date();
    this.claim.questionnaire.completedBy = 'tester';
    if (this.claim) {
      this.claimService.PUT(environment.mobileBackendUrl + '/api/v1/claim', JSON.stringify(this.claim)).subscribe((res) => {
        this.claim.id = res.guid;
        this.claimService.POST(environment.mobileBackendUrl + '/api/v1/bpms/doadjuster/' + this.claim.processId + '/' + true, JSON.stringify(this.task)).subscribe((res) => {
          this.navCtrl.pop();
        });
      });
    }
  }

  onIncomplete(): void {
    this.task.task_complete = false;
    this.task.task_approved = false;
    this.claimService.POST(environment.mobileBackendUrl + '/api/v1/bpms/doadjuster/' + this.claim.processId + '/' + false, JSON.stringify(this.task)).subscribe((res) => {
      this.navCtrl.pop();
    });
  }

}
