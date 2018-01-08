import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Claim } from '../../objects/Claim';
import { NewClaimComponent } from '../new-claim/new-claim.component';
import { ClaimDetailsComponent } from '../claim-details/claim-details.component';
import { ClaimService } from '../../services/claims.service';
import { environment } from '../../services/environment';

@Component({
  selector: 'existing-claims',
  templateUrl: 'existing-claims.component.html',
})
export class ExistingClaimsComponent {

  claims: Claim[];
  claim: Claim;
  gotData: boolean = false;

  constructor(private navCtrl: NavController, private claimService: ClaimService) { }

  ionViewDidEnter(): void {
    this.claimService.GET(environment.mobileBackendUrl + '/api/v1/claims').subscribe((res) => {
      this.claims = res;
      this.gotData = true;
    });
  }

  onHelp(): void {
    this.navCtrl.pop();
  }

  onNew(): void {
    this.navCtrl.push(NewClaimComponent);
  }

  onLoadClaimDetails(claim: Claim): void {
    this.navCtrl.push(ClaimDetailsComponent, claim);
  }

  doRefresh(refresher): void {
    this.claimService.GET(environment.mobileBackendUrl + '/api/v1/claims').subscribe((res) => {
      this.claims = res;
      this.gotData = true;
      refresher.complete();
    })

    setTimeout(() => {
      refresher.complete();
    }, 5000);
  }

}
