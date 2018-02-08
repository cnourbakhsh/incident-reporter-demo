import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Claim } from '../../objects/Claim';
import { NewClaimComponent } from '../new-claim/new-claim.component';
import { ClaimDetailsComponent } from '../claim-details/claim-details.component';
import { ClaimService } from '../../services/claims.service';
import { environment } from '../../services/environment';
import { Subscription } from 'rxjs/Subscription';
import { Http } from '@angular/http';

@Component({
  selector: 'existing-claims',
  templateUrl: 'existing-claims.component.html',
})
export class ExistingClaimsComponent {

  notifications: any[] = [];
  notificationsSubcription: Subscription;
  claims: Claim[];
  claim: Claim;
  gotData: boolean = false;
  notificationAlert: Claim["processId"];

  constructor(private navCtrl: NavController, private claimService: ClaimService, private http: Http) { }

  ionViewDidEnter(): void {
    this.claimService.GET((this.claimService.mobileBackendURL ? this.claimService.mobileBackendURL : environment.mobileBackendUrl) + '/api/v1/claims').subscribe((res) => {
      this.claims = res;
      this.gotData = true;
    })

    this.http.get((this.claimService.mobileBackendURL ? this.claimService.mobileBackendURL : environment.mobileBackendUrl) + '/api/v1/notifications/reporter').subscribe((res) => {
      if (this.notifications && this.notifications.length !== res.json().length) {
        let notification = res.json().pop();
        console.log('Notification Flag for Process ID: ' , notification.processId);
        this.notificationAlert = notification.processId;
      }
   })

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
    this.claimService.GET((this.claimService.mobileBackendURL ? this.claimService.mobileBackendURL : environment.mobileBackendUrl) + '/api/v1/claims').subscribe((res) => {
      this.claims = res;
      this.gotData = true;
    })
    this.http.get((this.claimService.mobileBackendURL ? this.claimService.mobileBackendURL : environment.mobileBackendUrl) + '/api/v1/notifications/reporter').subscribe((res) => {
      if (this.notifications && this.notifications.length !== res.json().length) {
        let notification = res.json().pop();
        console.log('Notification Flag for Process ID: ' , notification.processId);
        this.notificationAlert = notification.processId;
      }
   })
   refresher.complete();
    setTimeout(() => {
      refresher.complete();
    }, 5000);
  }

}
