import { Component, ViewChild } from '@angular/core';
import { OnDestroy } from '@angular/core/src/metadata/lifecycle_hooks';
import { Http } from '@angular/http';
import { Platform, AlertController, Nav } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/interval';
import 'rxjs/add/operator/mergeMap';
import { HomePage } from '../pages/home/home';
import { environment } from '../services/environment';
import { ClaimService } from '../services/claims.service';
import { ClaimDetailsComponent } from '../pages/claim-details/claim-details.component';
import { Claim } from '../objects/Claim';


@Component({
  templateUrl: 'app.html'
})
export class MyApp implements OnDestroy {

  @ViewChild(Nav) nav;
  rootPage: any = HomePage;
  notifications: any[] = [];
  notificationsSubcription: Subscription;
  claims: Claim[];

  constructor(platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen, private http: Http, private alertCtrl: AlertController, private claimService: ClaimService) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();
    });

    this.notificationsSubcription = Observable.interval(5000).flatMap(i => this.http.get((this.claimService.mobileBackendURL ? this.claimService.mobileBackendURL : environment.mobileBackendUrl) + '/api/v1/notifications/responder')).subscribe(res => {
      if (res.json().length > 0 && this.notifications && this.notifications.length !== res.json().length) {
        console.log(res.json().length);
        let notification = res.json().pop();
        console.log(notification);
        let confirm = this.alertCtrl.create({
          title: 'Attention',
          message: notification.readableMessage + ' for claim ' + notification.processId + ', View Updates?',
          buttons: [
            {
              text: 'No',
              handler: () => {
                console.log('NO - Dont want to View Claim Updates - ', this.nav);
                //Keep the user in the same page as he is currently IN.
                //if (this.nav.canGoBack()) {
                // this.nav.pop();
                //}
              }
            },
            {
              text: 'Yes',
              handler: () => {
                var pId = notification.processId;
                this.goToClaimDetails(pId);
              }
            }
          ]
        });
        confirm.present();
      }
      this.notifications = res.json();
    });
  }

  private goToClaimDetails(pId: number): void {
    console.log('processId : ', pId);    
     this.claimService.GET((this.claimService.mobileBackendURL ? this.claimService.mobileBackendURL : environment.mobileBackendUrl) + '/api/v1/claims').subscribe((res) => {
       this.claims = res;
       for (let claim of this.claims){
         if(claim.processId == pId){
          console.log('Load Claims Details for Process Id: ', claim.processId);
          this.nav.push(ClaimDetailsComponent, claim);
         }         
       }
    });
  }

  ngOnDestroy(): void {
    this.notificationsSubcription.unsubscribe();
  }
}

